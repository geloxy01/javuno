import { useEffect, useRef, useState } from "react";
import { PlusIcon, XIcon } from "./icons";

export default function AddListComposer({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setTitle("");
  }

  function submit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
    inputRef.current?.focus();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-72 shrink-0 items-center gap-2 rounded-2xl bg-white/25 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-white/80"
      >
        <PlusIcon />
        Add another list
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === "Escape" && close()}
      className="w-72 shrink-0 rounded-2xl bg-slate-100 p-2 shadow-soft dark:bg-slate-800"
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        placeholder="Enter list title…"
        aria-label="List title"
        className="input"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={!title.trim()}
          className="btn-primary !px-3 !py-1.5"
        >
          Add list
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <XIcon />
        </button>
      </div>
    </form>
  );
}
