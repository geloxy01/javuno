import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { XIcon } from "./icons";
import { useToast } from "../context/ToastContext";
import { formatWhen } from "../lib/dates";
import {
  describeNotification,
  markAllRead,
  markRead,
  removeNotification,
} from "../lib/notifications";

export default function NotificationsPanel({ uid, items, error, close }) {
  const navigate = useNavigate();
  const { showError } = useToast();
  const unread = items.filter((n) => !n.isRead).length;

  function open(n) {
    if (!n.isRead) markRead(uid, n.id).catch((err) => console.warn(err));
    close();
    navigate(n.cardId ? `/b/${n.boardId}/c/${n.cardId}` : `/b/${n.boardId}`);
  }

  function readAll() {
    markAllRead(uid, items).catch((err) =>
      showError("Could not mark notifications as read.", err),
    );
  }

  function remove(n) {
    removeNotification(uid, n.id).catch((err) =>
      showError("Could not delete the notification.", err),
    );
  }

  if (error) {
    return (
      <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Couldn't load notifications. Check that the latest Firestore rules are
        published.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {unread > 0 ? `${unread} unread` : "All caught up"}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={readAll}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-javuno transition hover:bg-javuno-light focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700"
          >
            Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Nothing yet. You'll see it here when someone adds you to a board,
          assigns you to a card, or comments on a card you're on.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((n) => {
            const d = describeNotification(n);
            return (
              <li
                key={n.id}
                className={`group flex items-start gap-1 rounded-xl ${
                  n.isRead ? "" : "bg-javuno-light/70 dark:bg-javuno/15"
                }`}
              >
                <button
                  type="button"
                  onClick={() => open(n)}
                  className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl p-2 text-left transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700"
                >
                  <Avatar name={d.actor} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm">
                      <strong className="font-semibold">{d.actor}</strong>{" "}
                      {d.text}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {n.type !== "board_added" && n.boardTitle
                        ? `${n.boardTitle} · `
                        : ""}
                      {formatWhen(n.createdAt)}
                    </span>
                  </span>
                  {!n.isRead && (
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-javuno"
                      aria-label="Unread"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(n)}
                  aria-label="Delete notification"
                  className="mt-2 rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-javuno group-hover:opacity-100 dark:hover:bg-slate-600 dark:hover:text-white"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
