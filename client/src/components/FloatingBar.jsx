import BarPopover, { barItemClass } from "./BarPopover";
import { BellIcon, BoardIcon, CalendarIcon, SwitchIcon } from "./barIcons";
import SwitchBoardsPanel from "./SwitchBoardsPanel";

function PanelButton({ label, hint, active, onClick, icon, badge = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={`${label} (${hint})`}
      className={barItemClass(active ? "active" : "idle")}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-slate-900">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export default function FloatingBar({
  boardId,
  user,
  visible,
  onToggle,
  unread,
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 sm:bottom-4">
      <nav
        aria-label="Board panels"
        className="pointer-events-auto relative isolate flex items-center gap-1 rounded-2xl p-1.5 shadow-2xl ring-1 ring-white/15"
      >
        {/* The blur lives on its own layer, so popovers stay positioned against the screen. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-2xl bg-slate-900/85 backdrop-blur-md"
        />

        <PanelButton
          label="Notifications"
          hint="g then n"
          active={visible.notifications}
          onClick={() => onToggle("notifications")}
          icon={<BellIcon />}
          badge={unread}
        />
        <PanelButton
          label="Planner"
          hint="g then p"
          active={visible.planner}
          onClick={() => onToggle("planner")}
          icon={<CalendarIcon />}
        />
        <PanelButton
          label="Board"
          hint="g then b"
          active={visible.board}
          onClick={() => onToggle("board")}
          icon={<BoardIcon />}
        />

        <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-white/20" />

        <BarPopover
          label="Switch boards"
          title="Switch boards"
          icon={<SwitchIcon />}
        >
          {(close) => (
            <SwitchBoardsPanel
              user={user}
              currentBoardId={boardId}
              view="board"
              close={close}
            />
          )}
        </BarPopover>
      </nav>
    </div>
  );
}
