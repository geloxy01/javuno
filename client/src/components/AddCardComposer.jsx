import { useEffect, useRef, useState } from "react";
import { PlusIcon, XIcon } from "./icons";

export default function AddCardComposer({ open, onOpen, onClose, onAdd }) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  function close() {
    setDraft("");
    onClose();
  }

  function submit() {
    const title = draft.replace(/\s+/g, " ").trim();
    if (!title) return;
    onAdd(title);
    setDraft("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      close();
    }
  }

  // Close when focus leaves the composer, but only if nothing was typed.
  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget) && !draft.trim()) {
      close();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      >
        <PlusIcon />
        Add a card
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onBlur={handleBlur}
    >
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        maxLength={200}
        placeholder="Enter a title for this card…"
        aria-label="Card title"
        className="input resize-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={!draft.trim()}
          className="btn-primary !px-3 !py-1.5"
        >
          Add card
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
