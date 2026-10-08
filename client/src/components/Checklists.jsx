import { useState } from "react";
import InlineEdit from "./InlineEdit";
import { PlusIcon, XIcon } from "./icons";
import { newId } from "../lib/id";

function AddItem({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  function close() {
    setOpen(false);
    setText("");
  }

  function submit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-6 mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-200/70 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-300/70 focus:outline-none focus:ring-2 focus:ring-javuno dark:bg-slate-700/70 dark:text-slate-200 dark:hover:bg-slate-600"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add an item
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="ml-6 mt-2">
      <input
        autoFocus
        value={text}
        maxLength={200}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        placeholder="Add an item"
        aria-label="New checklist item"
        className="input !py-1.5"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-primary !px-3 !py-1.5"
        >
          Add
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700"
        >
          <XIcon />
        </button>
      </div>
    </form>
  );
}

function ChecklistBlock({ checklist, onUpdate, onDelete }) {
  const items = checklist.items || [];
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const setItems = (next) => onUpdate({ ...checklist, items: next });

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={checklist.title}
            onSave={(title) => onUpdate({ ...checklist, title })}
            maxLength={80}
            label="Checklist title"
            className="block w-full truncate rounded-lg px-1.5 py-1 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-200/70 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-100 dark:hover:bg-slate-700"
            inputClassName="w-full rounded-lg border border-javuno bg-white px-1.5 py-1 text-sm font-semibold text-slate-800 outline-none ring-2 ring-javuno/30 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete the checklist "${checklist.title}"?`))
              onDelete(checklist);
          }}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Delete
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <span className="w-9 text-xs font-medium text-slate-500 dark:text-slate-400">
          {pct}%
        </span>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${checklist.title} progress`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pct === 100 ? "bg-emerald-500" : "bg-javuno"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="mt-2 space-y-0.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-start gap-2 rounded-lg px-1 py-1 transition hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
          >
            <input
              type="checkbox"
              checked={Boolean(item.done)}
              onChange={() =>
                setItems(
                  items.map((i) =>
                    i.id === item.id ? { ...i, done: !i.done } : i,
                  ),
                )
              }
              aria-label={item.text}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-javuno"
            />
            <div className="min-w-0 flex-1">
              <InlineEdit
                value={item.text}
                onSave={(text) =>
                  setItems(
                    items.map((i) => (i.id === item.id ? { ...i, text } : i)),
                  )
                }
                maxLength={200}
                label="Item text"
                className={`block w-full break-words rounded px-1 text-left text-sm focus:outline-none focus:ring-2 focus:ring-javuno ${
                  item.done
                    ? "text-slate-400 line-through dark:text-slate-500"
                    : "text-slate-800 dark:text-slate-100"
                }`}
                inputClassName="w-full rounded border border-javuno bg-white px-1 text-sm text-slate-800 outline-none ring-2 ring-javuno/30 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={() => setItems(items.filter((i) => i.id !== item.id))}
              aria-label="Delete item"
              className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-300/70 hover:text-slate-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-javuno group-hover:opacity-100 dark:hover:bg-slate-600 dark:hover:text-white"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <AddItem
        onAdd={(text) =>
          setItems([...items, { id: newId(), text, done: false }])
        }
      />
    </div>
  );
}

export default function Checklists({ checklists, onChange, onRemove }) {
  return (
    <div className="space-y-5">
      {checklists.map((checklist) => (
        <ChecklistBlock
          key={checklist.id}
          checklist={checklist}
          onUpdate={(updated) =>
            onChange(
              checklists.map((c) => (c.id === checklist.id ? updated : c)),
            )
          }
          onDelete={onRemove}
        />
      ))}
    </div>
  );
}
