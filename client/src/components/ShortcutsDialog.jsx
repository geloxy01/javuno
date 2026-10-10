import { useEffect } from "react";
import { XIcon } from "./icons";

const SHORTCUTS = [
  {
    keys: ["n"],
    text: "Add a card to the list under the pointer (or the first list)",
  },
  { keys: ["/"], text: "Search cards" },
  {
    keys: ["g", "n"],
    sequence: true,
    text: "Show or hide the Notifications panel",
  },
  { keys: ["g", "p"], sequence: true, text: "Show or hide the Planner panel" },
  { keys: ["g", "b"], sequence: true, text: "Show or hide the Board panel" },
  {
    keys: ["Esc"],
    text: "Close a dialog, popover or card, and clear the search",
  },
  { keys: ["?"], text: "Show or hide this help" },
];

export default function ShortcutsDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault(); // keeps an open card modal from closing too
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Keyboard shortcuts</h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <XIcon />
          </button>
        </div>

        <ul className="space-y-3">
          {SHORTCUTS.map((s) => (
            <li key={s.keys.join("+")} className="flex items-start gap-3">
              <span className="flex w-24 shrink-0 items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={k} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-xs text-slate-400">then</span>
                    )}
                    <kbd className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                      {k}
                    </kbd>
                  </span>
                ))}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {s.text}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-slate-400">
          Shortcuts are ignored while you are typing in a field. Drag cards and
          lists with the mouse, or press and hold on a touch screen. Drag a card
          onto the Planner to give it a due date.
        </p>
      </div>
    </div>
  );
}
