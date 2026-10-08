import Avatar from "./Avatar";
import Popover from "./Popover";
import { UsersIcon } from "./uiIcons";

export function CardMembersPopover({ members, card, onToggle }) {
  const assigned = new Set(card.memberIds || []);

  return (
    <Popover icon={<UsersIcon />} label="Members" title="Card members">
      {() => (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {members.map((m) => {
            const isOn = assigned.has(m.uid);
            return (
              <li key={m.uid}>
                <button
                  type="button"
                  onClick={() => onToggle(m, isOn)}
                  aria-pressed={isOn}
                  className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700"
                >
                  <Avatar name={m.displayName} photoURL={m.photoURL} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {m.displayName}
                    </span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {m.email}
                    </span>
                  </span>
                  {isOn && (
                    <span className="text-javuno" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Popover>
  );
}
