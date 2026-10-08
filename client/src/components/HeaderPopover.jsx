import { useEffect, useRef, useState } from "react";
import { XIcon } from "./icons";

export const HEADER_BUTTON =
  "inline-flex items-center gap-1.5 rounded-lg p-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/80 aria-expanded:bg-white/20";

export default function HeaderPopover({
  label,
  title,
  trigger,
  children,
  align = "right", // 'right' for the header, 'left' for the toolbar
  buttonClassName = HEADER_BUTTON,
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

  const position =
    align === "left"
      ? "absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)]"
      : "fixed inset-x-3 top-[3.75rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={buttonClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={title}
          className={`${position} z-50 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100`}
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
