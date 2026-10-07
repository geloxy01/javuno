import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AddListComposer from "../components/AddListComposer";
import BoardSkeleton from "../components/BoardSkeleton";
import InlineEdit from "../components/InlineEdit";
import ListColumn from "../components/ListColumn";
import Navbar from "../components/Navbar";
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
import { createCard, subscribeToCards } from "../lib/cards";
import {
  archiveList,
  copyList,
  createList,
  renameList,
  subscribeToLists,
} from "../lib/lists";
import { nextPosition } from "../lib/position";

export default function BoardPage() {
  const { boardId } = useParams();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [board, setBoard] = useState(null);
  const [boardStatus, setBoardStatus] = useState("loading"); // 'loading' | 'ready' | 'denied'
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [listsReady, setListsReady] = useState(false);
  const [cardsReady, setCardsReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const scrollerRef = useRef(null);

  // Real-time subscriptions for the board, its lists and its cards.
  useEffect(() => {
    setBoard(null);
    setBoardStatus("loading");
    setLists([]);
    setCards([]);
    setListsReady(false);
    setCardsReady(false);
    setLoadFailed(false);

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
          setLists(data);
          setListsReady(true);
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
          setCards(data);
          setCardsReady(true);
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
  }, [boardId, showError]);

  // Tab title follows the board name.
  useEffect(() => {
    if (board?.title) document.title = `${board.title} | Javuno`;
    return () => {
      document.title = "Javuno";
    };
  }, [board?.title]);

  // Group cards by list (already sorted by position).
  const cardsByList = useMemo(() => {
    const map = {};
    cards.forEach((card) => {
      if (!map[card.listId]) map[card.listId] = [];
      map[card.listId].push(card);
    });
    return map;
  }, [cards]);

  const isStarred = Boolean(board?.starredBy?.includes(user.uid));
  const members = board?.members ? Object.entries(board.members) : [];

  // ----- Actions -----

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
    createList(boardId, title, nextPosition(lists)).catch((err) =>
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
      nextPosition(lists),
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
          <div className="flex h-full items-start gap-3 px-4 pb-4 pt-3">
            {lists.length === 0 && (
              <div className="w-72 shrink-0 rounded-2xl bg-white/20 p-4 text-white backdrop-blur">
                <p className="font-semibold">This board is empty</p>
                <p className="mt-1 text-sm text-white/80">
                  Add your first list to start organizing your work.
                </p>
              </div>
            )}

            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                cards={cardsByList[list.id] || []}
                onRename={handleRenameList}
                onAddCard={handleAddCard}
                onCopy={handleCopyList}
                onArchive={handleArchiveList}
              />
            ))}

            <AddListComposer onAdd={handleAddList} />
            <div className="w-1 shrink-0" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
