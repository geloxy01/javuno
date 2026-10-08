import { useEffect, useMemo, useState } from "react";
import HeaderPopover, { HEADER_BUTTON } from "./HeaderPopover";
import { ArchiveIcon } from "./icons";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  deleteCardForever,
  deleteListForever,
  restoreCard,
  restoreList,
  subscribeToArchivedCards,
  subscribeToArchivedLists,
} from "../lib/archive";
import { formatWhen } from "../lib/dates";
import { nextPosition } from "../lib/position";

const tabClass = (active) =>
  `flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-javuno ${
    active
      ? "bg-javuno text-white"
      : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
  }`;

const dangerButton =
  "rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60 dark:hover:bg-red-950/40";

function Row({ title, meta, busy, onRestore, onDelete }) {
  return (
    <li className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-700/60">
      <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-100">
        {title}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {meta}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onRestore}
          disabled={busy}
          className="btn-secondary !px-3 !py-1 !text-xs"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className={dangerButton}
        >
          Delete permanently
        </button>
      </div>
    </li>
  );
}

function Panel({ boardId, lists, cards }) {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [tab, setTab] = useState("cards");
  const [term, setTerm] = useState("");
  const [archivedCards, setArchivedCards] = useState(null); // null = still loading
  const [archivedLists, setArchivedLists] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Listen only while the panel is open.
  useEffect(() => {
    const unsubscribeCards = subscribeToArchivedCards(
      boardId,
      setArchivedCards,
      (err) => {
        setArchivedCards([]);
        showError("Could not load archived cards.", err);
      },
    );
    const unsubscribeLists = subscribeToArchivedLists(
      boardId,
      setArchivedLists,
      (err) => {
        setArchivedLists([]);
        showError("Could not load archived lists.", err);
      },
    );
    return () => {
      unsubscribeCards();
      unsubscribeLists();
    };
  }, [boardId, showError]);

  const listName = (listId) =>
    lists.find((l) => l.id === listId)?.title ??
    archivedLists?.find((l) => l.id === listId)?.title ??
    "a deleted list";
  const listIsArchived = (listId) => !lists.some((l) => l.id === listId);

  const needle = term.trim().toLowerCase();
  const shownCards = useMemo(
    () =>
      (archivedCards || []).filter((c) =>
        c.title.toLowerCase().includes(needle),
      ),
    [archivedCards, needle],
  );
  const shownLists = useMemo(
    () =>
      (archivedLists || []).filter((l) =>
        l.title.toLowerCase().includes(needle),
      ),
    [archivedLists, needle],
  );

  function run(id, request, onError) {
    setBusyId(id);
    request.catch(onError).finally(() => setBusyId(null));
  }

  // ----- Cards -----

  function handleRestoreCard(card) {
    const original = lists.find((l) => l.id === card.listId);
    const target = original || lists[0];
    if (!target) {
      showError(
        "This board has no visible lists. Restore or add a list first.",
      );
      return;
    }
    const position = nextPosition(cards.filter((c) => c.listId === target.id));
    run(
      card.id,
      restoreCard(boardId, user, card, target.id, position, target.title).then(
        () =>
          showSuccess(
            original
              ? `"${card.title}" was restored to ${target.title}.`
              : `Its list is archived, so "${card.title}" was restored to ${target.title}.`,
          ),
      ),
      (err) => showError("Could not restore the card.", err),
    );
  }

  function handleDeleteCard(card) {
    if (
      !window.confirm(
        `Permanently delete "${card.title}" and its comments? This cannot be undone.`,
      )
    ) {
      return;
    }
    run(
      card.id,
      deleteCardForever(boardId, card.id).then(() =>
        showSuccess("Card deleted."),
      ),
      (err) => showError("Could not delete the card.", err),
    );
  }

  // ----- Lists -----

  function handleRestoreList(list) {
    run(
      list.id,
      restoreList(boardId, list.id, nextPosition(lists)).then(() =>
        showSuccess(`"${list.title}" was restored.`),
      ),
      (err) => showError("Could not restore the list.", err),
    );
  }

  function handleDeleteList(list) {
    const count = cards.filter((c) => c.listId === list.id).length;
    const extra =
      count > 0 ? ` and its ${count} ${count === 1 ? "card" : "cards"}` : "";
    if (
      !window.confirm(
        `Permanently delete the list "${list.title}"${extra}? This cannot be undone.`,
      )
    ) {
      return;
    }
    run(
      list.id,
      deleteListForever(boardId, list.id).then(() =>
        showSuccess("List deleted."),
      ),
      (err) => showError("Could not delete the list.", err),
    );
  }

  const loading = archivedCards === null || archivedLists === null;
  const showingCards = tab === "cards";

  return (
    <div className="space-y-3">
      <div
        className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700/60"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={showingCards}
          onClick={() => setTab("cards")}
          className={tabClass(showingCards)}
        >
          Cards{archivedCards ? ` (${archivedCards.length})` : ""}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!showingCards}
          onClick={() => setTab("lists")}
          className={tabClass(!showingCards)}
        >
          Lists{archivedLists ? ` (${archivedLists.length})` : ""}
        </button>
      </div>

      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={
          showingCards ? "Filter archived cards…" : "Filter archived lists…"
        }
        aria-label="Filter archived items"
        className="input !py-2"
      />

      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
      ) : showingCards ? (
        shownCards.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            {archivedCards.length === 0
              ? "No archived cards."
              : "No archived cards match."}
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {shownCards.map((card) => (
              <Row
                key={card.id}
                title={card.title}
                meta={`in ${listName(card.listId)}${
                  listIsArchived(card.listId) ? " (archived list)" : ""
                } · archived ${formatWhen(card.updatedAt)}`}
                busy={busyId === card.id}
                onRestore={() => handleRestoreCard(card)}
                onDelete={() => handleDeleteCard(card)}
              />
            ))}
          </ul>
        )
      ) : shownLists.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">
          {archivedLists.length === 0
            ? "No archived lists."
            : "No archived lists match."}
        </p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {shownLists.map((list) => {
            const count = cards.filter((c) => c.listId === list.id).length;
            return (
              <Row
                key={list.id}
                title={list.title}
                meta={`${count} ${count === 1 ? "card" : "cards"} · archived ${formatWhen(
                  list.updatedAt,
                )}`}
                busy={busyId === list.id}
                onRestore={() => handleRestoreList(list)}
                onDelete={() => handleDeleteList(list)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ArchivePopover({ boardId, lists, cards }) {
  return (
    <HeaderPopover
      label="Archived items"
      title="Archived items"
      buttonClassName={HEADER_BUTTON}
      trigger={<ArchiveIcon className="h-5 w-5" />}
    >
      <Panel boardId={boardId} lists={lists} cards={cards} />
    </HeaderPopover>
  );
}
