import { useEffect, useRef, useState } from "react";
import { ArchiveIcon, CopyIcon, DotsIcon, PlusIcon } from "./icons";

export default function ListMenu({ onAddCard, onCopy, onArchive }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target))
        setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function run(fn) {
    setOpen(false);
    fn();
  }

  const itemClass =
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-javuno-light focus:bg-javuno-light focus:outline-none dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="List actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
      >
        <DotsIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <button
            role="menuitem"
            type="button"
            className={itemClass}
            onClick={() => run(onAddCard)}
          >
            <PlusIcon /> Add card
          </button>
          <button
            role="menuitem"
            type="button"
            className={itemClass}
            onClick={() => run(onCopy)}
          >
            <CopyIcon /> Copy list
          </button>
          <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
          <button
            role="menuitem"
            type="button"
            className={itemClass}
            onClick={() => run(onArchive)}
          >
            <ArchiveIcon /> Archive list
          </button>
        </div>
      )}
    </div>
  );
}
