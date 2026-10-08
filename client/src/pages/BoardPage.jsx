import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
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
import BoardSkeleton from "../components/BoardSkeleton";
import CardItem from "../components/CardItem";
import InlineEdit from "../components/InlineEdit";
import ListColumn from "../components/ListColumn";
import Navbar from "../components/Navbar";
import SortableList from "../components/SortableList";
import { ArrowLeftIcon, StarIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  DEFAULT_BACKGROUND,
  backgroundStyle,
  renameBoard,
  subscribeToBoard,
  toggleStar,
} from "../lib/boards";
import {
  createCard,
  moveCard,
  rebalanceCards,
  subscribeToCards,
} from "../lib/cards";
import { SmartMouseSensor, SmartTouchSensor } from "../lib/dndSensors";
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

function withMove(item, moves) {
  const move = moves.get(item.id);
  return move ? { ...item, ...move.patch } : item;
}

export default function BoardPage() {
  const { boardId } = useParams();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [board, setBoard] = useState(null);
  const [boardStatus, setBoardStatus] = useState("loading"); // 'loading' | 'ready' | 'denied'
  const [localLists, setLocalLists] = useState([]); // what is rendered (server data + pending moves + live drag)
  const [localCards, setLocalCards] = useState([]);
  const [listsReady, setListsReady] = useState(false);
  const [cardsReady, setCardsReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [active, setActive] = useState(null); // { id, type } while dragging

  const scrollerRef = useRef(null);
  const serverRef = useRef({ lists: [], cards: [] }); // latest data from Firestore
  const overlayRef = useRef({ lists: new Map(), cards: new Map() }); // moves written but not yet confirmed
  const draggingRef = useRef(false);
  const originRef = useRef(null); // list the dragged card started in
  const lastOverId = useRef(null);
  const recentlyMovedRef = useRef(false);
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

  // Real-time subscriptions for the board, its lists and its cards.
  useEffect(() => {
    serverRef.current = { lists: [], cards: [] };
    overlayRef.current = { lists: new Map(), cards: new Map() };
    draggingRef.current = false;
    setBoard(null);
    setBoardStatus("loading");
    setLocalLists([]);
    setLocalCards([]);
    setListsReady(false);
    setCardsReady(false);
    setLoadFailed(false);
    setActive(null);

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

  // Group cards by list. Order inside a list is the array order.
  const cardsByList = useMemo(() => {
    const map = {};
    localCards.forEach((card) => {
      if (!map[card.listId]) map[card.listId] = [];
      map[card.listId].push(card);
    });
    return map;
  }, [localCards]);

  const listIds = useMemo(() => localLists.map((l) => l.id), [localLists]);

  const isStarred = Boolean(board?.starredBy?.includes(user.uid));
  const members = board?.members ? Object.entries(board.members) : [];

  // ----- Drag and drop -----

  // Lists only collide with lists. Cards collide with the card under the pointer,
  // or with the list itself when it is empty.
  const collisionDetection = useCallback((args) => {
    if (args.active.data.current?.type === "list") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => c.data.current?.type === "list",
        ),
      });
    }

    const pointerHits = pointerWithin(args);
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
    let overId = getFirstCollision(hits, "id");

    if (overId != null) {
      const container = args.droppableContainers.find((c) => c.id === overId);
      if (container?.data.current?.type === "list") {
        const listCardIds = cardsRef.current
          .filter((c) => c.listId === overId)
          .map((c) => c.id);
        if (listCardIds.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
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

  function handleDragStart({ active: dragged }) {
    const type = dragged.data.current?.type;
    draggingRef.current = true;
    lastOverId.current = null;
    originRef.current =
      type === "card"
        ? (cardsRef.current.find((c) => c.id === dragged.id)?.listId ?? null)
        : null;
    setActive({ id: dragged.id, type });
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

    persistMoves(
      "cards",
      patches,
      () =>
        plan.rebalanced
          ? rebalanceCards(
              boardId,
              plan.updates.map((u) => ({
                id: u.id,
                listId: card.listId,
                position: u.position,
              })),
            )
          : moveCard(boardId, card.id, card.listId, plan.updates[0].position),
      "Could not move the card. It was put back.",
    );
  }

  function finishDrag() {
    draggingRef.current = false;
    setActive(null);
    syncFromServer();
  }

  function handleDragEnd({ active: dragged, over }) {
    const type = dragged.data.current?.type;
    if (over) {
      if (type === "list") commitListMove(dragged.id, over.id);
      else if (type === "card") commitCardMove(dragged.id, over);
    }
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
      .then(() => showSuccess(`"${list.title}" was archived.`))
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

  return (
    <div className="flex h-full flex-col" style={style}>
      {/* Translucent top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-black/25 px-3 text-white backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
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
                  className="block max-w-[50vw] truncate rounded-lg px-2 py-1 text-lg font-bold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/80"
                  inputClassName="w-64 max-w-[60vw] rounded-lg bg-white px-2 py-1 text-lg font-bold text-slate-800 outline-none ring-2 ring-javuno"
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

        <div className="flex items-center gap-3">
          {members.length > 0 && (
            <div className="flex -space-x-2">
              {members.slice(0, 4).map(([uid, m]) =>
                m.photoURL ? (
                  <img
                    key={uid}
                    src={m.photoURL}
                    alt={m.displayName}
                    title={m.displayName}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white/70"
                  />
                ) : (
                  <div
                    key={uid}
                    title={m.displayName}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-javuno text-xs font-semibold text-white ring-2 ring-white/70"
                  >
                    {(m.displayName || "?").charAt(0).toUpperCase()}
                  </div>
                ),
              )}
            </div>
          )}
          <Link
            to="/"
            className="hidden items-center gap-2 sm:flex"
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
      </header>

      {/* Horizontally scrolling lists */}
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
            <div className="flex h-full items-start gap-3 px-4 pb-4 pt-3">
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
                    onRename={handleRenameList}
                    onAddCard={handleAddCard}
                    onCopy={handleCopyList}
                    onArchive={handleArchiveList}
                  />
                ))}
              </SortableContext>

              <AddListComposer onAdd={handleAddList} />
              <div className="w-1 shrink-0" aria-hidden="true" />
            </div>

            {createPortal(
              <DragOverlay
                dropAnimation={{
                  duration: 220,
                  easing: "cubic-bezier(0.2, 0, 0, 1)",
                }}
              >
                {activeCard ? (
                  <CardItem card={activeCard} isOverlay />
                ) : activeList ? (
                  <ListColumn
                    list={activeList}
                    cards={cardsByList[activeList.id] || []}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )}
          </DndContext>
        )}
      </div>
    </div>
  );
}
