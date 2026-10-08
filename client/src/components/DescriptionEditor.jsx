import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

const tabClass = (active) =>
  `rounded-lg px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-javuno ${
    active
      ? "bg-javuno text-white"
      : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
  }`;

export default function DescriptionEditor({ value, onSave }) {
  const current = value || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [tab, setTab] = useState("write");

  useEffect(() => {
    if (!editing) setDraft(current);
  }, [current, editing]);

  function open() {
    setDraft(current);
    setTab("write");
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setDraft(current);
  }

  function save() {
    const next = draft.trim();
    setEditing(false);
    if (next !== current.trim()) onSave(next);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
  }

  if (!editing) {
    if (!current.trim()) {
      return (
        <button
          type="button"
          onClick={open}
          className="w-full rounded-xl bg-slate-200/70 px-3 py-4 text-left text-sm text-slate-500 transition hover:bg-slate-300/70 focus:outline-none focus:ring-2 focus:ring-javuno dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Add a more detailed description…
        </button>
      );
    }
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (e.target.closest("a")) return; // let links work
          open();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target === e.currentTarget) open();
        }}
        title="Click to edit"
        className="cursor-text rounded-xl px-2 py-1.5 transition hover:bg-slate-200/50 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700/40"
      >
        <Markdown>{current}</Markdown>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTab("write")}
          className={tabClass(tab === "write")}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={tabClass(tab === "preview")}
        >
          Preview
        </button>
        <span className="ml-auto text-xs text-slate-400">
          Markdown supported
        </span>
      </div>

      {tab === "write" ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={7}
          maxLength={10000}
          aria-label="Card description"
          placeholder="Write in markdown: **bold**, - lists, [links](https://…), `code`"
          className="input resize-y font-mono !text-[13px]"
        />
      ) : (
        <div className="min-h-[10rem] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800">
          {draft.trim() ? (
            <Markdown>{draft}</Markdown>
          ) : (
            <p className="text-sm text-slate-400">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="btn-primary !px-3 !py-1.5"
        >
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          className="btn-secondary !px-3 !py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
