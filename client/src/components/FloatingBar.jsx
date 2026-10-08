import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BarPopover, { barItemClass } from "./BarPopover";
import { BellIcon, BoardIcon, CalendarIcon, SwitchIcon } from "./barIcons";
import NotificationsPanel from "./NotificationsPanel";
import SwitchBoardsPanel from "./SwitchBoardsPanel";
import { useToast } from "../context/ToastContext";
import { millis } from "../lib/dates";
import {
  describeNotification,
  subscribeToNotifications,
} from "../lib/notifications";

export default function FloatingBar({ boardId, view, user }) {
  const { showSuccess } = useToast();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(false);
  const seenRef = useRef(null); // ids already shown; null until the first load

  useEffect(() => {
    seenRef.current = null;
    setItems([]);
    setError(false);

    return subscribeToNotifications(
      user.uid,
      (list) => {
        // After the first load, announce brand-new unread notifications.
        if (seenRef.current) {
          list
            .filter(
              (n) =>
                !n.isRead &&
                !seenRef.current.has(n.id) &&
                millis(n.createdAt) > Date.now() - 60000,
            )
            .forEach((n) => {
              const d = describeNotification(n);
              showSuccess(`${d.actor} ${d.text}`);
            });
        }
        seenRef.current = new Set(list.map((n) => n.id));
        setItems(list);
        setError(false);
      },
      (err) => {
        console.warn("Could not load notifications", err);
        setError(true);
      },
    );
  }, [user.uid, showSuccess]);

  const unread = items.filter((n) => !n.isRead).length;
  const inPlanner = view === "planner";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 sm:bottom-4">
      <nav
        aria-label="Board navigation"
        className="pointer-events-auto relative isolate flex items-center gap-1 rounded-2xl p-1.5 shadow-2xl ring-1 ring-white/15"
      >
        {/* The blur lives on its own layer, so popovers stay positioned against the screen. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-2xl bg-slate-900/85 backdrop-blur-md"
        />

        <BarPopover
          label="Notifications"
          title="Notifications"
          icon={<BellIcon />}
          badge={unread}
        >
          {(close) => (
            <NotificationsPanel
              uid={user.uid}
              items={items}
              error={error}
              close={close}
            />
          )}
        </BarPopover>

        <Link
          to={`/b/${boardId}/planner`}
          aria-label="Planner"
          title="Planner"
          aria-current={inPlanner ? "page" : undefined}
          className={barItemClass(inPlanner ? "active" : "idle")}
        >
          <CalendarIcon />
          <span className="hidden sm:inline">Planner</span>
        </Link>

        <Link
          to={`/b/${boardId}`}
          aria-label="Board"
          title="Board"
          aria-current={!inPlanner ? "page" : undefined}
          className={barItemClass(!inPlanner ? "active" : "idle")}
        >
          <BoardIcon />
          <span className="hidden sm:inline">Board</span>
        </Link>

        <BarPopover
          label="Switch boards"
          title="Switch boards"
          icon={<SwitchIcon />}
        >
          {(close) => (
            <SwitchBoardsPanel
              user={user}
              currentBoardId={boardId}
              view={view}
              close={close}
            />
          )}
        </BarPopover>
      </nav>
    </div>
  );
}
