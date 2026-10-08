import { useEffect, useRef, useState } from "react";
import { XIcon } from "./icons";

export const SIDEBAR_BUTTON =
  "flex w-full items-center gap-2 rounded-lg bg-slate-200/70 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-300/70 focus:outline-none focus:ring-2 focus:ring-javuno dark:bg-slate-700/70 dark:text-slate-100 dark:hover:bg-slate-600";

export default function Popover({
  icon,
  label,
  title,
  children,
  width = "w-72",
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
        e.preventDefault(); // the modal ignores Esc presses that are already handled
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
        aria-haspopup="dialog"
        aria-expanded={open}
        className={SIDEBAR_BUTTON}
      >
        {icon}
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={title}
          className={`absolute right-0 top-full z-50 mt-2 ${width} max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-100">
              {title}
            </h4>
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
