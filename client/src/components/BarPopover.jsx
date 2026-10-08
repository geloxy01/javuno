import { useEffect, useRef, useState } from "react";
import { XIcon } from "./icons";

// state: 'active' = the current view (indigo), 'open' = popover is open, otherwise idle.
export function barItemClass(state = "idle") {
  const look =
    state === "active"
      ? "bg-javuno text-white shadow-soft"
      : state === "open"
        ? "bg-white/15 text-white"
        : "text-white/90 hover:bg-white/10 hover:text-white";
  return `relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/70 ${look}`;
}

export default function BarPopover({
  label,
  title,
  icon,
  badge = 0,
  children,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function onMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target))
        setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault(); // marks the Esc as used, so an open card modal stays open
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={barItemClass(open ? "open" : "idle")}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-slate-900">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={title}
          className="fixed inset-x-3 bottom-[5rem] z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:absolute sm:inset-x-auto sm:bottom-full sm:left-1/2 sm:mb-3 sm:w-96 sm:-translate-x-1/2"
        >
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">{title}</h4>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
