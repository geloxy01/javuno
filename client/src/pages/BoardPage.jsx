import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import AddListComposer from "../components/AddListComposer";
import ArchivePopover from "../components/ArchivePanel";
import BackgroundPopover from "../components/BackgroundPicker";
import BoardSkeleton from "../components/BoardSkeleton";
import BoardToolbar from "../components/BoardToolbar";
import CardItem from "../components/CardItem";
import CardModal from "../components/CardModal";
import FloatingBar from "../components/FloatingBar";
import { HEADER_BUTTON } from "../components/HeaderPopover";
import InlineEdit from "../components/InlineEdit";
import ListColumn from "../components/ListColumn";
import MembersPopover from "../components/MembersPanel";
import Navbar from "../components/Navbar";
import NotificationsPanel from "../components/NotificationsPanel";
import PanelWorkspace from "../components/PanelWorkspace";
import PlannerPanel from "../components/PlannerPanel";
import ShortcutsDialog from "../components/ShortcutsDialog";
import SidePanel from "../components/SidePanel";
import SortableList from "../components/SortableList";
import ThemeToggle from "../components/ThemeToggle";
import { ArrowLeftIcon, StarIcon } from "../components/icons";
import { HelpIcon } from "../components/uiIcons";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { logActivity } from "../lib/activity";
import {
  DEFAULT_BACKGROUND,
  backgroundStyle,
  deleteBoard,
  renameBoard,
  setBackground,
  subscribeToBoard,
  toggleStar,
} from "../lib/boards";
import {
  createCard,
  moveCard,
  rebalanceCards,
  subscribeToCards,
  updateCard,
} from "../lib/cards";
import { toDate } from "../lib/dates";
import { SmartMouseSensor, SmartTouchSensor } from "../lib/dndSensors";
import { EMPTY_FILTERS, cardMatches, hasActiveFilter } from "../lib/filters";
import { subscribeToLabels } from "../lib/labels";
import {
  archiveList,
  copyList,
  createList,
  moveList,
  rebalanceLists,
  renameList,
  subscribeToLists,
} from "../lib/lists";
import { nextPosition, planMove, sortByPosition } from "../lib/position";
import useNotifications from "../lib/useNotifications";
import usePanels from "../lib/usePanels";

const PANEL_KEYS = { n: "notifications", p: "planner", b: "board" };
const noop = () => {};

function withMove(item, moves) {
  const move = moves.get(item.id);
  return move ? { ...item, ...move.patch } : item;
}

// Client position of a mouse, pointer or touch event.
function pointOf(e) {
  const t = e?.touches?.[0] || e?.changedTouches?.[0] || e;
  return typeof t?.clientX === "number" ? { x: t.clientX, y: t.clientY } : null;
}

export default function BoardPage() {
  const params = useParams();
  const boardId = params.boardId;

  // The splat is "" or "c/<cardId>". Old "/planner" links simply show the board.
  const splat = params["*"] || "";
  const openCardId = splat.match(/^c\/([^/]+)/)?.[1] ?? null;
  const basePath = `/b/${boardId}`;

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const { visible, toggle, widths, setWidth, narrow } = usePanels();
  const notifications = useNotifications(user.uid);

  const [board, setBoard] = useState(null);
  const [boardStatus, setBoardStatus] = useState("loading"); // 'loading' | 'ready' | 'denied'
  const [localLists, setLocalLists] = useState([]); // what is rendered (server data + pending moves + live drag)
  const [localCards, setLocalCards] = useState([]);
  const [labels, setLabels] = useState([]);
  const [listsReady, setListsReady] = useState(false);
  const [cardsReady, setCardsReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [active, setActive] = useState(null); // { id, type, cardId } while dragging

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [helpOpen, setHelpOpen] = useState(false);
  const [composeRequest, setComposeRequest] = useState(null); // { listId, at } set by the "n" shortcut

  const scrollerRef = useRef(null);
  const searchRef = useRef(null);
  const hoverListRef = useRef(null);
  const serverRef = useRef({ lists: [], cards: [] }); // latest data from Firestore
  const overlayRef = useRef({ lists: new Map(), cards: new Map() }); // moves written but not yet confirmed
  const draggingRef = useRef(false);
  const originRef = useRef(null); // list the dragged card started in
  const lastOverId = useRef(null);
  const recentlyMovedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 }); // last pointer position while dragging
  const skipDropAnimation = useRef(false);
  const gPendingRef = useRef(0); // time "g" was pressed, for g-then-n/p/b
  const listsRef = useRef([]);
  const cardsRef = useRef([]);
  listsRef.current = localLists;
  cardsRef.current = localCards;

  // Mouse needs a 6px move before a drag starts (so clicks still work).
  // Touch needs a short press, so normal swipes still scroll the board.
  const sensors = useSensors(
    useSensor(SmartMouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(SmartTouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
  );

  // Rebuild the rendered data from Firestore + pending moves. Skipped while dragging.
  const syncFromServer = useCallback(() => {
    if (draggingRef.current) return;
    const { lists: serverLists, cards: serverCards } = serverRef.current;
    const { lists: listMoves, cards: cardMoves } = overlayRef.current;
    setLocalLists(
      sortByPosition(serverLists.map((l) => withMove(l, listMoves))),
    );
    setLocalCards(
      sortByPosition(serverCards.map((c) => withMove(c, cardMoves))),
    );
  }, []);

  // Real-time subscriptions for the board, its lists, its cards and its labels.
  useEffect(() => {
    serverRef.current = { lists: [], cards: [] };
    overlayRef.current = { lists: new Map(), cards: new Map() };
    draggingRef.current = false;
    hoverListRef.current = null;
    setBoard(null);
    setBoardStatus("loading");
    setLocalLists([]);
    setLocalCards([]);
    setLabels([]);
    setListsReady(false);
    setCardsReady(false);
    setLoadFailed(false);
    setActive(null);
    setQuery("");
    setFilters(EMPTY_FILTERS);
    setComposeRequest(null);

    const unsubscribers = [
      subscribeToBoard(
        boardId,
        (b) => {
          setBoard(b);
          setBoardStatus(b ? "ready" : "denied");
        },
        (err) => {
          console.error(err);
          setBoardStatus("denied");
        },
      ),
      subscribeToLists(
        boardId,
        (data) => {
          serverRef.current.lists = data;
          setListsReady(true);
          syncFromServer();
        },
        (err) => {
          console.error(err);
          setListsReady(true);
          setLoadFailed(true);
          showError("Could not load the lists.", err);
        },
      ),
      subscribeToCards(
        boardId,
        (data) => {
          serverRef.current.cards = data;
          setCardsReady(true);
          syncFromServer();
        },
        (err) => {
          console.error(err);
          setCardsReady(true);
          setLoadFailed(true);
          showError("Could not load the cards.", err);
        },
      ),
      subscribeToLabels(boardId, setLabels, (err) =>
        console.error("Could not load labels", err),
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [boardId, showError, syncFromServer]);

  // Tab title follows the board name.
  useEffect(() => {
    if (board?.title) document.title = `${board.title} | Javuno`;
    return () => {
      document.title = "Javuno";
    };
  }, [board?.title]);

  // After a card moves to another list the layout shifts for a frame; remember that for collision detection.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      recentlyMovedRef.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [localCards]);

  // While something is being dragged, remember where the pointer is.
  // The planner uses it to turn "dropped here" into a time of day.
  const dragging = active !== null;
  useEffect(() => {
    if (!dragging) return undefined;
    function onMove(e) {
      const point = pointOf(e);
      if (point) pointerRef.current = point;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mousemove", onMove);
    };
  }, [dragging]);

  // Group cards by list. Order inside a list is the array order.
  const cardsByList = useMemo(() => {
    const map = {};
    localCards.forEach((card) => {
      if (!map[card.listId]) map[card.listId] = [];
      map[card.listId].push(card);
    });
    return map;
  }, [localCards]);

  const labelsById = useMemo(
    () => Object.fromEntries(labels.map((l) => [l.id, l])),
    [labels],
  );
  const listIds = useMemo(() => localLists.map((l) => l.id), [localLists]);

  const membersList = useMemo(
    () =>
      Object.entries(board?.members || {})
        .map(([uid, m]) => ({ uid, ...m }))
        .sort((a, b) =>
          (a.displayName || "").localeCompare(b.displayName || ""),
        ),
    [board?.members],
  );
  const membersById = useMemo(
    () => Object.fromEntries(membersList.map((m) => [m.uid, m])),
    [membersList],
  );

  // Search and filters: the ids of cards that match, or null when nothing is filtered.
  const filterActive = hasActiveFilter(query, filters);
  const matchIds = useMemo(() => {
    if (!filterActive) return null;
    return new Set(
      localCards
        .filter((card) =>
          cardMatches(card, query, filters, labelsById, membersById),
        )
        .map((card) => card.id),
    );
  }, [filterActive, localCards, query, filters, labelsById, membersById]);

  const isStarred = Boolean(board?.starredBy?.includes(user.uid));

  // ----- Card modal navigation -----

  const openCard = useCallback(
    (card) => navigate(`${basePath}/c/${card.id}`),
    [navigate, basePath],
  );

  // If the modal was opened from the page, go back in history. If the page was opened on the card link, replace it.
  const closeCard = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else navigate(basePath, { replace: true });
  }, [location.key, navigate, basePath]);

  // ----- Keyboard shortcuts: n, /, ?, and g then n / p / b (Esc is handled by each dialog) -----

  const handleHoverList = useCallback((listId) => {
    hoverListRef.current = listId;
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;

      const el = e.target;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el?.isContentEditable
      )
        return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }

      // The other shortcuts work on the page itself, not behind an open card or dialog.
      if (openCardId || helpOpen) return;

      const key = e.key.toLowerCase();

      // Second key of "g then ...".
      if (gPendingRef.current && Date.now() - gPendingRef.current < 1500) {
        gPendingRef.current = 0;
        if (PANEL_KEYS[key]) {
          e.preventDefault();
          toggle(PANEL_KEYS[key]);
          return;
        }
      }

      if (key === "g") {
        gPendingRef.current = Date.now();
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (key === "n") {
        if (!visible.board) return; // no lists on screen to add to
        const lists = listsRef.current;
        if (lists.length === 0) {
          showError("Add a list first, then press n to add a card.");
          return;
        }
        e.preventDefault();
        const target =
          lists.find((l) => l.id === hoverListRef.current) || lists[0];
        setComposeRequest({ listId: target.id, at: Date.now() });
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openCardId, helpOpen, visible.board, toggle, showError]);

  // ----- Drag and drop -----

  // Lists only collide with lists. Calendar chips only collide with calendar days.
  // Cards collide with a calendar day when the pointer is over one, otherwise with
  // the card under the pointer, or with the list itself when it is empty.
  const collisionDetection = useCallback((args) => {
    const type = args.active.data.current?.type;
    const isSlot = (c) => c.data.current?.type === "slot";

    if (type === "list") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => c.data.current?.type === "list",
        ),
      });
    }

    if (type === "chip") {
      return pointerWithin({
        ...args,
        droppableContainers: args.droppableContainers.filter(isSlot),
      }).slice(0, 1);
    }

    const slotHits = pointerWithin({
      ...args,
      droppableContainers: args.droppableContainers.filter(isSlot),
    });
    if (slotHits.length > 0) return slotHits.slice(0, 1);

    const boardArgs = {
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => !isSlot(c)),
    };
    const pointerHits = pointerWithin(boardArgs);
    const hits =
      pointerHits.length > 0 ? pointerHits : rectIntersection(boardArgs);
    let overId = getFirstCollision(hits, "id");

    if (overId != null) {
      const container = boardArgs.droppableContainers.find(
        (c) => c.id === overId,
      );
      if (container?.data.current?.type === "list") {
        const listCardIds = cardsRef.current
          .filter((c) => c.listId === overId)
          .map((c) => c.id);
        if (listCardIds.length > 0) {
          const closest = closestCenter({
            ...boardArgs,
            droppableContainers: boardArgs.droppableContainers.filter(
              (c) => c.id !== overId && listCardIds.includes(c.id),
            ),
          });
          overId = closest[0]?.id ?? overId;
        }
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    }

    // Right after a card changes list the layout shifts; keep the last target so items don't jump.
    if (recentlyMovedRef.current) lastOverId.current = args.active.id;
    return lastOverId.current ? [{ id: lastOverId.current }] : [];
  }, []);

  // Show the move on screen right away, write it, and undo it with a toast if the write fails.
  function persistMoves(kind, patches, write, failureMessage) {
    const token = Symbol("move");
    const moves = overlayRef.current[kind];
    patches.forEach(({ id, patch }) => moves.set(id, { token, patch }));

    write()
      .catch((err) => showError(failureMessage, err))
      .finally(() => {
        // Success: server data now matches. Failure: Firestore has reverted, so the card snaps back.
        patches.forEach(({ id }) => {
          if (moves.get(id)?.token === token) moves.delete(id);
        });
        syncFromServer();
      });
  }

  function handleDragStart({ active: dragged, activatorEvent }) {
    const type = dragged.data.current?.type;
    draggingRef.current = true;
    lastOverId.current = null;
    skipDropAnimation.current = false;
    pointerRef.current = pointOf(activatorEvent) || pointerRef.current;
    originRef.current =
      type === "card"
        ? (cardsRef.current.find((c) => c.id === dragged.id)?.listId ?? null)
        : null;
    setActive({
      id: dragged.id,
      type,
      cardId: dragged.data.current?.cardId ?? null,
    });
  }

  // Cards: move into the list being hovered, so the placeholder appears there.
  function handleDragOver({ active: dragged, over }) {
    if (!over || dragged.data.current?.type !== "card") return;

    const cards = cardsRef.current;
    const activeCard = cards.find((c) => c.id === dragged.id);
    if (!activeCard) return;

    const overIsList = over.data.current?.type === "list";
    const overCard = overIsList ? null : cards.find((c) => c.id === over.id);
    const targetListId = overIsList ? over.id : overCard?.listId;

    // Same list: the sortable animation handles it, the order is applied on drop.
    // Over the calendar (no list or card): nothing to move yet.
    if (!targetListId || targetListId === activeCard.listId) return;

    const without = cards.filter((c) => c.id !== dragged.id);
    let insertAt = without.length; // empty list or list background: put it last
    if (overCard) {
      const overIndex = without.findIndex((c) => c.id === overCard.id);
      const translated = dragged.rect.current.translated;
      const draggedCenter = translated
        ? translated.top + translated.height / 2
        : 0;
      const isBelow =
        translated && draggedCenter > over.rect.top + over.rect.height / 2;
      insertAt = overIndex + (isBelow ? 1 : 0);
    }

    const next = [
      ...without.slice(0, insertAt),
      { ...activeCard, listId: targetListId },
      ...without.slice(insertAt),
    ];
    recentlyMovedRef.current = true;
    cardsRef.current = next;
    setLocalCards(next);
  }

  function commitListMove(activeId, overId) {
    const lists = listsRef.current;
    const from = lists.findIndex((l) => l.id === activeId);
    const to = lists.findIndex((l) => l.id === overId);
    if (from < 0 || to < 0 || from === to) return;

    const ordered = arrayMove(lists, from, to);
    const plan = planMove(ordered, to);
    const patches = plan.updates.map((u) => ({
      id: u.id,
      patch: { position: u.position },
    }));

    persistMoves(
      "lists",
      patches,
      () =>
        plan.rebalanced
          ? rebalanceLists(boardId, plan.updates)
          : moveList(boardId, activeId, plan.updates[0].position),
      "Could not move the list. It was put back.",
    );
  }

  function commitCardMove(activeId, over) {
    const cards = cardsRef.current;
    const card = cards.find((c) => c.id === activeId);
    if (!card) return;

    // Same-list reorder: apply the order the sortable animation was showing.
    let ordered = cards;
    const overCard =
      over.data.current?.type === "card"
        ? cards.find((c) => c.id === over.id)
        : null;
    if (
      overCard &&
      overCard.id !== card.id &&
      overCard.listId === card.listId
    ) {
      const from = cards.findIndex((c) => c.id === card.id);
      const to = cards.findIndex((c) => c.id === overCard.id);
      ordered = arrayMove(cards, from, to);
    }

    const listCards = ordered.filter((c) => c.listId === card.listId);
    const index = listCards.findIndex((c) => c.id === card.id);
    const prev = listCards[index - 1];
    const next = listCards[index + 1];

    // Dropped back in the same slot of the same list: nothing to write.
    const stays =
      originRef.current === card.listId &&
      (!prev || (prev.position ?? 0) < (card.position ?? 0)) &&
      (!next || (card.position ?? 0) < (next.position ?? 0));
    if (stays) return;

    const plan = planMove(listCards, index);
    const patches = plan.updates.map((u) => ({
      id: u.id,
      patch: { listId: card.listId, position: u.position },
    }));

    // Moving between lists is worth an activity entry (only written once the move succeeded).
    const changedList = originRef.current && originRef.current !== card.listId;
    const fromName = listsRef.current.find(
      (l) => l.id === originRef.current,
    )?.title;
    const toName = listsRef.current.find((l) => l.id === card.listId)?.title;

    persistMoves(
      "cards",
      patches,
      () => {
        const request = plan.rebalanced
          ? rebalanceCards(
              boardId,
              plan.updates.map((u) => ({
                id: u.id,
                listId: card.listId,
                position: u.position,
              })),
            )
          : moveCard(boardId, card.id, card.listId, plan.updates[0].position);
        return changedList
          ? request.then(() =>
              logActivity(boardId, user, {
                type: "card_moved",
                cardId: card.id,
                data: { from: fromName, to: toName },
              }),
            )
          : request;
      },
      "Could not move the card. It was put back.",
    );
  }

  // Dropped on a calendar day: set the card's due date. Firestore shows the change at once
  // and reverts it by itself if the write is rejected.
  function scheduleFromDrop(cardId, over) {
    const card =
      serverRef.current.cards.find((c) => c.id === cardId) ||
      cardsRef.current.find((c) => c.id === cardId);
    const resolve = over.data.current?.resolve;
    if (!card || typeof resolve !== "function") return false;

    const date = resolve(pointerRef.current, card);
    if (!date || Number.isNaN(date.getTime())) return false;

    const current = toDate(card.dueDate);
    if (current && current.getTime() === date.getTime()) return true; // same moment: nothing to write

    updateCard(boardId, card.id, { dueDate: Timestamp.fromDate(date) }).catch(
      (err) => showError("Could not set the due date.", err),
    );
    return true;
  }

  function finishDrag() {
    draggingRef.current = false;
    setActive(null);
    syncFromServer();
  }

  function handleDragEnd({ active: dragged, over }) {
    const type = dragged.data.current?.type;
    let scheduled = false;

    if (over) {
      if (type === "list") {
        commitListMove(dragged.id, over.id);
      } else if (over.data.current?.type === "slot") {
        const cardId =
          type === "chip" ? dragged.data.current.cardId : dragged.id;
        scheduled = scheduleFromDrop(cardId, over);
      } else if (type === "card") {
        commitCardMove(dragged.id, over);
      }
    }

    skipDropAnimation.current = scheduled; // the card just appears on the calendar, no fly-back
    finishDrag();
  }

  // ----- Other actions -----

  function handleRenameBoard(title) {
    renameBoard(boardId, title).catch((err) =>
      showError("Could not rename the board.", err),
    );
  }

  function handleToggleStar() {
    toggleStar(boardId, user.uid, !isStarred).catch((err) =>
      showError("Could not update the star.", err),
    );
  }

  function handleBackground(background) {
    setBackground(boardId, background).catch((err) =>
      showError("Could not change the background.", err),
    );
  }

  function handleLeft() {
    showSuccess("You left the board.");
    navigate("/", { replace: true });
  }

  // Go back to the boards page right away; the cleanup continues in the background.
  function handleDeleteBoard() {
    navigate("/", { replace: true });
    deleteBoard(boardId)
      .then(() => showSuccess("Board deleted."))
      .catch((err) => showError("Could not delete the board.", err));
  }

  function clearSearchAndFilters() {
    setQuery("");
    setFilters(EMPTY_FILTERS);
  }

  function handleAddList(title) {
    createList(boardId, title, nextPosition(localLists)).catch((err) =>
      showError("Could not add the list.", err),
    );
    // Scroll to the new list once it has rendered.
    setTimeout(() => {
      const scroller = scrollerRef.current;
      if (scroller)
        scroller.scrollTo({ left: scroller.scrollWidth, behavior: "smooth" });
    }, 150);
  }

  function handleRenameList(list, title) {
    renameList(boardId, list.id, title).catch((err) =>
      showError("Could not rename the list.", err),
    );
  }

  function handleArchiveList(list) {
    archiveList(boardId, list.id)
      .then(() =>
        showSuccess(
          `"${list.title}" was archived. Find it under Archived items.`,
        ),
      )
      .catch((err) => showError("Could not archive the list.", err));
  }

  function handleCopyList(list) {
    copyList(
      boardId,
      user,
      list,
      cardsByList[list.id] || [],
      nextPosition(localLists),
    )
      .then(() => showSuccess("List copied."))
      .catch((err) => showError("Could not copy the list.", err));
  }

  function handleAddCard(list, title) {
    createCard(
      boardId,
      user,
      list.id,
      title,
      nextPosition(cardsByList[list.id] || []),
      list.title,
    ).catch((err) => showError("Could not add the card.", err));
  }

  // ----- Render -----

  if (boardStatus === "denied") {
    return (
      <div className="min-h-full">
        <Navbar />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Board not found</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This board doesn't exist, or you don't have access to it.
          </p>
          <Link to="/" className="btn-primary mt-6">
            Back to your boards
          </Link>
        </main>
      </div>
    );
  }

  const loading = boardStatus === "loading" || !listsReady || !cardsReady;
  const style = board
    ? backgroundStyle(board.background)
    : { background: DEFAULT_BACKGROUND.value };

  const activeCard =
    active?.type === "card" ? localCards.find((c) => c.id === active.id) : null;
  const activeList =
    active?.type === "list" ? localLists.find((l) => l.id === active.id) : null;
  const activeChip =
    active?.type === "chip"
      ? localCards.find((c) => c.id === active.cardId)
      : null;
  const openCardData = openCardId
    ? (localCards.find((c) => c.id === openCardId) ?? null)
    : null;

  // A panel can be closed with its own X as long as another one stays open.
  const openCount = Object.values(visible).filter(Boolean).length;
  const closable = !narrow && openCount > 1;
  const plannerStatus = loading ? "loading" : loadFailed ? "error" : "ready";

  const notificationsPanel = (
    <SidePanel
      title={
        <>
          Notifications
          {notifications.unread > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
              {notifications.unread}
            </span>
          )}
        </>
      }
      onClose={closable ? () => toggle("notifications") : undefined}
    >
      <NotificationsPanel
        uid={user.uid}
        items={notifications.items}
        error={notifications.error}
        close={noop}
      />
    </SidePanel>
  );

  const plannerPanel = (
    <PlannerPanel
      cards={localCards}
      lists={localLists}
      matchIds={matchIds}
      status={plannerStatus}
      boardVisible={visible.board}
      onOpenCard={openCard}
      onClose={closable ? () => toggle("planner") : undefined}
    />
  );

  const boardPanel = (
    <div
      ref={scrollerRef}
      className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
    >
      {loading ? (
        <BoardSkeleton />
      ) : loadFailed ? (
        <div className="px-4 pt-6">
          <div className="max-w-md rounded-2xl bg-white/90 p-5 shadow-soft dark:bg-slate-800/90">
            <h2 className="font-semibold">
              Couldn't load this board's content
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Check your Firestore rules and your connection, then reload the
              page.
            </p>
          </div>
        </div>
      ) : (
        // pb-20 leaves room for the floating bar
        <div className="flex h-full items-start gap-3 px-3 pb-20 pt-3">
          {localLists.length === 0 && (
            <div className="w-72 shrink-0 rounded-2xl bg-white/20 p-4 text-white backdrop-blur">
              <p className="font-semibold">This board is empty</p>
              <p className="mt-1 text-sm text-white/80">
                Add your first list to start organizing your work.
              </p>
            </div>
          )}

          <SortableContext
            items={listIds}
            strategy={horizontalListSortingStrategy}
          >
            {localLists.map((list) => (
              <SortableList
                key={list.id}
                list={list}
                cards={cardsByList[list.id] || []}
                labelsById={labelsById}
                membersById={membersById}
                matchIds={matchIds}
                composeRequest={composeRequest}
                onHoverList={handleHoverList}
                onRename={handleRenameList}
                onAddCard={handleAddCard}
                onCopy={handleCopyList}
                onArchive={handleArchiveList}
                onOpenCard={openCard}
              />
            ))}
          </SortableContext>

          <AddListComposer onAdd={handleAddList} />
          <div className="w-1 shrink-0" aria-hidden="true" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col" style={style}>
      {/* Translucent top bar */}
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 px-3 text-white sm:px-4">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-black/25 backdrop-blur-md"
        />

        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Link
            to="/"
            aria-label="Back to boards"
            title="Back to boards"
            className="rounded-lg p-2 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            <ArrowLeftIcon />
          </Link>

          {board ? (
            <>
              <div className="min-w-0">
                <InlineEdit
                  value={board.title}
                  onSave={handleRenameBoard}
                  maxLength={80}
                  label="Board title"
                  className="block max-w-[34vw] truncate rounded-lg px-2 py-1 text-lg font-bold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/80 sm:max-w-xs"
                  inputClassName="w-48 max-w-[50vw] rounded-lg bg-white px-2 py-1 text-lg font-bold text-slate-800 outline-none ring-2 ring-javuno sm:w-64"
                />
              </div>
              <button
                type="button"
                onClick={handleToggleStar}
                aria-pressed={isStarred}
                aria-label={isStarred ? "Unstar this board" : "Star this board"}
                title={isStarred ? "Unstar this board" : "Star this board"}
                className={`rounded-lg p-2 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/80 ${
                  isStarred ? "text-yellow-300" : "text-white"
                }`}
              >
                <StarIcon filled={isStarred} />
              </button>
            </>
          ) : (
            <div className="h-7 w-40 animate-pulse rounded-lg bg-white/30" />
          )}
        </div>

        {board && (
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <MembersPopover
              boardId={boardId}
              board={board}
              user={user}
              onLeft={handleLeft}
              onDelete={handleDeleteBoard}
            />
            <BackgroundPopover
              background={board.background}
              onChange={handleBackground}
            />
            <ArchivePopover
              boardId={boardId}
              lists={localLists}
              cards={localCards}
            />
            <ThemeToggle className={HEADER_BUTTON} />
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              className={`${HEADER_BUTTON} hidden md:inline-flex`}
            >
              <HelpIcon />
            </button>
            <Link
              to="/"
              className="ml-2 hidden items-center gap-2 lg:flex"
              title="Javuno"
            >
              <img
                src="/logo.png"
                alt="Javuno"
                className="h-7 w-7 rounded-lg shadow-soft"
              />
              <span className="text-sm font-bold tracking-tight">Javuno</span>
            </Link>
          </div>
        )}
      </header>

      {/* Search and filters */}
      {board && (
        <BoardToolbar
          searchRef={searchRef}
          query={query}
          onQuery={setQuery}
          filters={filters}
          onFilters={setFilters}
          labels={labels}
          members={membersList}
          matchCount={matchIds ? matchIds.size : localCards.length}
          totalCount={localCards.length}
          active={filterActive}
          onClear={clearSearchAndFilters}
        />
      )}

      {/* One drag context for all panels, so a card can be dragged from the board onto the planner */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        autoScroll={{ threshold: { x: 0.12, y: 0.15 }, acceleration: 12 }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={finishDrag}
      >
        <PanelWorkspace
          visible={visible}
          widths={widths}
          narrow={narrow}
          onResize={setWidth}
          panels={{
            notifications: notificationsPanel,
            planner: plannerPanel,
            board: boardPanel,
          }}
        />

        {createPortal(
          <DragOverlay
            dropAnimation={
              skipDropAnimation.current
                ? null
                : { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" }
            }
          >
            {activeCard ? (
              <CardItem
                card={activeCard}
                labelsById={labelsById}
                membersById={membersById}
                isOverlay
              />
            ) : activeList ? (
              <ListColumn
                list={activeList}
                cards={cardsByList[activeList.id] || []}
                labelsById={labelsById}
                membersById={membersById}
                isOverlay
              />
            ) : activeChip ? (
              <div className="drag-pickup max-w-[14rem] cursor-grabbing truncate rounded-md bg-javuno-light px-2 py-1 text-xs font-medium text-javuno-dark shadow-xl ring-1 ring-javuno/50 dark:bg-javuno/40 dark:text-white">
                {activeChip.title}
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {/* Card detail modal: /b/:boardId/c/:cardId */}
      {openCardId && !loading && !loadFailed && (
        <CardModal
          boardId={boardId}
          boardTitle={board?.title}
          card={openCardData}
          lists={localLists}
          labels={labels}
          members={membersList}
          onClose={closeCard}
        />
      )}

      {board && (
        <FloatingBar
          boardId={boardId}
          user={user}
          visible={visible}
          onToggle={toggle}
          unread={notifications.unread}
        />
      )}

      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
