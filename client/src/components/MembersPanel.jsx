import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import HeaderPopover, { HEADER_BUTTON } from "./HeaderPopover";
import { UsersIcon } from "./uiIcons";
import { useToast } from "../context/ToastContext";
import { addMember, removeMember, searchUsersByEmail } from "../lib/members";

function listMembers(board) {
  return Object.entries(board.members || {})
    .map(([uid, m]) => ({ uid, ...m }))
    .sort((a, b) => {
      if (a.uid === board.ownerId) return -1;
      if (b.uid === board.ownerId) return 1;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
}

function Panel({ boardId, board, user, close, onLeft, onDelete }) {
  const { showError, showSuccess } = useToast();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busyUid, setBusyUid] = useState(null);

  const isOwner = board.ownerId === user.uid;
  const members = listMembers(board);
  const memberKey = (board.memberIds || []).join(",");

  // Debounced search by email prefix.
  useEffect(() => {
    const text = term.trim();
    if (text.length < 3) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsersByEmail(text);
        if (cancelled) return;
        const existing = memberKey.split(",");
        setResults(found.filter((u) => !existing.includes(u.uid)));
        setSearched(true);
      } catch (err) {
        if (!cancelled) showError("Could not search for users.", err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, memberKey, showError]);

  function handleAdd(person) {
    const name = person.displayName || person.email;
    setBusyUid(person.uid);
    addMember(boardId, person)
      .then(() => {
        showSuccess(`${name} was added to the board.`);
        setResults((list) => list.filter((u) => u.uid !== person.uid));
      })
      .catch((err) => showError("Could not add the member.", err))
      .finally(() => setBusyUid(null));
  }

  function handleRemove(member) {
    if (
      !window.confirm(
        `Remove ${member.displayName || "this member"} from the board?`,
      )
    )
      return;
    setBusyUid(member.uid);
    removeMember(boardId, member.uid)
      .then(() =>
        showSuccess(`${member.displayName || "The member"} was removed.`),
      )
      .catch((err) => showError("Could not remove the member.", err))
      .finally(() => setBusyUid(null));
  }

  function handleLeave() {
    if (!window.confirm("Leave this board? You will lose access to it."))
      return;
    removeMember(boardId, user.uid)
      .then(() => {
        close();
        onLeft();
      })
      .catch((err) => showError("Could not leave the board.", err));
  }

  function handleDelete() {
    if (
      !window.confirm(
        "Delete this board with all its lists, cards and comments? This cannot be undone.",
      )
    ) {
      return;
    }
    close();
    onDelete();
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <section>
          <label
            htmlFor="invite-email"
            className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400"
          >
            Invite by email
          </label>
          <input
            id="invite-email"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Start typing an email…"
            autoComplete="off"
            className="input !py-2"
          />
          <p className="mt-1 text-xs text-slate-400">
            They must already have a Javuno account.
          </p>

          {searching && (
            <p className="mt-2 text-xs text-slate-400">Searching…</p>
          )}

          {results.length > 0 && (
            <ul className="mt-2 space-y-1">
              {results.map((person) => (
                <li
                  key={person.uid}
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Avatar
                    name={person.displayName || person.email}
                    photoURL={person.photoURL}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {person.displayName || person.email}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {person.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(person)}
                    disabled={busyUid === person.uid}
                    className="btn-primary !px-3 !py-1"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!searching && searched && results.length === 0 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No matching users who aren't already on this board.
            </p>
          )}
        </section>
      )}

      <section>
        <h5 className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Board members ({members.length})
        </h5>
        <ul className="space-y-1">
          {members.map((m) => (
            <li
              key={m.uid}
              className="flex items-center gap-2 rounded-lg p-1.5"
            >
              <Avatar name={m.displayName} photoURL={m.photoURL} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.displayName}
                  {m.uid === user.uid ? " (you)" : ""}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {m.email}
                </p>
              </div>
              {m.uid === board.ownerId ? (
                <span className="rounded-full bg-javuno-light px-2 py-0.5 text-xs font-semibold text-javuno-dark dark:bg-javuno/30 dark:text-white">
                  Owner
                </span>
              ) : (
                isOwner && (
                  <button
                    type="button"
                    onClick={() => handleRemove(m)}
                    disabled={busyUid === m.uid}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 dark:hover:bg-red-950/40"
                  >
                    Remove
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-slate-200 pt-3 dark:border-slate-700">
        {isOwner ? (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg px-2 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 dark:hover:bg-red-950/40"
          >
            Delete this board
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-lg px-2 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 dark:hover:bg-red-950/40"
          >
            Leave this board
          </button>
        )}
      </section>
    </div>
  );
}

export default function MembersPopover({
  boardId,
  board,
  user,
  onLeft,
  onDelete,
}) {
  const members = listMembers(board);

  return (
    <HeaderPopover
      label="Board members"
      title="Board members"
      buttonClassName={`${HEADER_BUTTON} !p-1.5`}
      trigger={
        <>
          <span className="flex -space-x-2">
            {members.slice(0, 3).map((m, i) => (
              <span key={m.uid} className={i >= 2 ? "hidden sm:block" : ""}>
                <Avatar
                  name={m.displayName}
                  photoURL={m.photoURL}
                  className="h-8 w-8"
                  ring="ring-2 ring-white/70"
                />
              </span>
            ))}
          </span>
          {members.length > 3 && (
            <span className="hidden text-xs sm:inline">
              +{members.length - 3}
            </span>
          )}
          <UsersIcon className="h-4 w-4 md:hidden" />
          <span className="hidden md:inline">Members</span>
        </>
      }
    >
      {(close) => (
        <Panel
          boardId={boardId}
          board={board}
          user={user}
          close={close}
          onLeft={onLeft}
          onDelete={onDelete}
        />
      )}
    </HeaderPopover>
  );
}
