import { XIcon } from "./icons";

export default function SidePanel({
  title,
  onClose,
  toolbar,
  children,
  bodyClassName = "overflow-y-auto p-3",
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-slate-100/95 text-slate-800 shadow-soft dark:bg-slate-800/95 dark:text-slate-100">
      <header className="flex shrink-0 items-center gap-2 px-3 pb-1 pt-3">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm font-bold">
          {title}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            title="Close panel"
            className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </header>

      {toolbar && <div className="shrink-0 px-3 pb-2">{toolbar}</div>}

      <div className={`min-h-0 flex-1 rounded-b-2xl ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
