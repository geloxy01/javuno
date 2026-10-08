import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StarIcon } from "./icons";
import { backgroundStyle, subscribeToMyBoards } from "../lib/boards";

export default function SwitchBoardsPanel({
  user,
  currentBoardId,
  view,
  close,
}) {
  const navigate = useNavigate();
  const [boards, setBoards] = useState(null); // null = loading
  const [term, setTerm] = useState("");

  useEffect(
    () =>
      subscribeToMyBoards(user.uid, setBoards, (err) => {
        console.error(err);
        setBoards([]);
      }),
    [user.uid],
  );

  const shown = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const starred = (b) => Boolean(b.starredBy?.includes(user.uid));
    return (boards || [])
      .filter((b) => b.title.toLowerCase().includes(needle))
      .sort((a, b) => Number(starred(b)) - Number(starred(a))); // stable: keeps newest-first inside each group
  }, [boards, term, user.uid]);

  function go(board) {
    close();
    if (board.id === currentBoardId) return;
    navigate(`/b/${board.id}${view === "planner" ? "/planner" : ""}`);
  }

  if (boards === null) {
    return <p className="py-4 text-center text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div className="space-y-3">
      {boards.length > 6 && (
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search boards…"
          aria-label="Search boards"
          className="input !py-2"
        />
      )}

      {shown.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">
          {boards.length === 0
            ? "You don't have any boards yet."
            : "No boards match."}
        </p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {shown.map((board) => {
            const current = board.id === currentBoardId;
            const starred = Boolean(board.starredBy?.includes(user.uid));
            return (
              <li key={board.id}>
                <button
                  type="button"
                  onClick={() => go(board)}
                  aria-current={current ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700 ${
                    current ? "bg-javuno-light dark:bg-javuno/20" : ""
                  }`}
                >
                  <span
                    style={backgroundStyle(board.background)}
                    className="h-9 w-12 shrink-0 rounded-lg shadow-sm ring-1 ring-black/10"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {board.title}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {board.ownerId === user.uid ? "Owner" : "Member"}
                      {current ? " · current" : ""}
                    </span>
                  </span>
                  {starred && (
                    <StarIcon
                      filled
                      className="h-4 w-4 shrink-0 text-yellow-400"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        to="/"
        onClick={close}
        className="block rounded-lg px-2 py-1.5 text-center text-sm font-semibold text-javuno transition hover:bg-javuno-light focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700"
      >
        All boards
      </Link>
    </div>
  );
}
