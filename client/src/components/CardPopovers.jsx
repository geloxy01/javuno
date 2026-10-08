import { useState } from "react";
import Popover from "./Popover";
import { ClockIcon, CheckSquareIcon } from "./icons";
import { ImageIcon, PencilIcon, TagIcon, TrashIcon } from "./modalIcons";
import { useToast } from "../context/ToastContext";
import { toDate, toDateInput, toTimeInput } from "../lib/dates";
import {
  COVER_COLORS,
  LABEL_COLORS,
  createLabel,
  deleteLabel,
  updateLabel,
} from "../lib/labels";

/* ---------- Labels ---------- */

function LabelsPanel({ boardId, labels, card, onToggle }) {
  const { showError } = useToast();
  const [editing, setEditing] = useState(null); // null = list view, 'new' or a label object
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]);

  const assigned = new Set(card.labelIds || []);

  function startEdit(label) {
    setEditing(label ?? "new");
    setName(label?.name ?? "");
    setColor(label?.color ?? LABEL_COLORS[0]);
  }

  function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();
    const request =
      editing === "new"
        ? createLabel(boardId, trimmed, color)
        : updateLabel(boardId, editing.id, { name: trimmed, color });
    request.catch((err) => showError("Could not save the label.", err));
    setEditing(null);
  }

  function handleDelete() {
    if (
      !window.confirm(
        "Delete this label? It will be removed from every card that uses it.",
      )
    ) {
      return;
    }
    deleteLabel(boardId, editing.id).catch((err) =>
      showError("Could not delete the label.", err),
    );
    setEditing(null);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-3">
        <input
          autoFocus
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Label name (optional)"
          aria-label="Label name"
          className="input !py-2"
        />
        <div
          className="grid grid-cols-5 gap-2"
          role="group"
          aria-label="Label color"
        >
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              style={{ background: c }}
              className={`h-8 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-javuno focus:ring-offset-2 ${
                color === c
                  ? "ring-2 ring-javuno ring-offset-2"
                  : "hover:opacity-80"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary !px-3 !py-1.5">
            {editing === "new" ? "Create" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="btn-secondary !px-3 !py-1.5"
          >
            Back
          </button>
          {editing !== "new" && (
            <button
              type="button"
              onClick={handleDelete}
              className="ml-auto rounded-lg px-2 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div>
      <ul className="max-h-64 space-y-1.5 overflow-y-auto">
        {labels.map((label) => {
          const isOn = assigned.has(label.id);
          return (
            <li key={label.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggle(label, isOn)}
                aria-pressed={isOn}
                style={{ background: label.color }}
                className="flex h-8 min-w-0 flex-1 items-center justify-between rounded-lg px-3 text-left text-sm font-semibold text-white transition hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-javuno focus:ring-offset-1"
              >
                <span className="truncate">{label.name || "\u00a0"}</span>
                {isOn && <span aria-hidden="true">✓</span>}
              </button>
              <button
                type="button"
                onClick={() => startEdit(label)}
                aria-label={`Edit label ${label.name || ""}`}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-javuno dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <PencilIcon />
              </button>
            </li>
          );
        })}
      </ul>
      {labels.length === 0 && (
        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
          No labels yet. Labels are shared by every card on this board.
        </p>
      )}
      <button
        type="button"
        onClick={() => startEdit(null)}
        className="btn-secondary mt-3 w-full !py-2"
      >
        Create a new label
      </button>
    </div>
  );
}

export function LabelsPopover({ boardId, labels, card, onToggle }) {
  return (
    <Popover icon={<TagIcon />} label="Labels" title="Labels">
      {() => (
        <LabelsPanel
          boardId={boardId}
          labels={labels}
          card={card}
          onToggle={onToggle}
        />
      )}
    </Popover>
  );
}

/* ---------- Dates ---------- */

function DatesPanel({ card, onSave, onRemove, close }) {
  const existing = toDate(card.dueDate);
  const [date, setDate] = useState(existing ? toDateInput(existing) : "");
  const [time, setTime] = useState(existing ? toTimeInput(existing) : "12:00");

  function handleSubmit(e) {
    e.preventDefault();
    if (!date) return;
    const value = new Date(`${date}T${time || "12:00"}`);
    if (Number.isNaN(value.getTime())) return;
    onSave(value);
    close();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="due-date"
          className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400"
        >
          Due date
        </label>
        <input
          id="due-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input !py-2"
        />
      </div>
      <div>
        <label
          htmlFor="due-time"
          className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400"
        >
          Time
        </label>
        <input
          id="due-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="input !py-2"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!date}
          className="btn-primary !px-3 !py-1.5"
        >
          Save
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => {
              onRemove();
              close();
            }}
            className="btn-secondary !px-3 !py-1.5"
          >
            Remove
          </button>
        )}
      </div>
    </form>
  );
}

export function DatesPopover({ card, onSave, onRemove }) {
  return (
    <Popover
      icon={<ClockIcon className="h-4 w-4" />}
      label="Dates"
      title="Due date"
    >
      {(close) => (
        <DatesPanel
          card={card}
          onSave={onSave}
          onRemove={onRemove}
          close={close}
        />
      )}
    </Popover>
  );
}

/* ---------- Checklist ---------- */

function ChecklistPanel({ onAdd, close }) {
  const [title, setTitle] = useState("Checklist");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    close();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="checklist-title"
          className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400"
        >
          Title
        </label>
        <input
          id="checklist-title"
          autoFocus
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="input !py-2"
        />
      </div>
      <button
        type="submit"
        disabled={!title.trim()}
        className="btn-primary !px-3 !py-1.5"
      >
        Add
      </button>
    </form>
  );
}

export function ChecklistPopover({ onAdd }) {
  return (
    <Popover
      icon={<CheckSquareIcon className="h-4 w-4" />}
      label="Checklist"
      title="Add checklist"
    >
      {(close) => <ChecklistPanel onAdd={onAdd} close={close} />}
    </Popover>
  );
}

/* ---------- Cover ---------- */

function CoverPanel({ card, onChange, close }) {
  return (
    <div>
      <div
        className="grid grid-cols-5 gap-2"
        role="group"
        aria-label="Cover color"
      >
        {COVER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              onChange(c);
              close();
            }}
            aria-label={`Cover color ${c}`}
            aria-pressed={card.coverColor === c}
            style={{ background: c }}
            className={`h-8 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-javuno focus:ring-offset-2 ${
              card.coverColor === c
                ? "ring-2 ring-javuno ring-offset-2"
                : "hover:opacity-80"
            }`}
          />
        ))}
      </div>
      {card.coverColor && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            close();
          }}
          className="btn-secondary mt-3 w-full !py-2"
        >
          Remove cover
        </button>
      )}
    </div>
  );
}

export function CoverPopover({ card, onChange }) {
  return (
    <Popover icon={<ImageIcon />} label="Cover" title="Cover color">
      {(close) => <CoverPanel card={card} onChange={onChange} close={close} />}
    </Popover>
  );
}

/* ---------- Delete ---------- */

export function DeletePopover({ onConfirm }) {
  return (
    <Popover icon={<TrashIcon />} label="Delete" title="Delete card?">
      {(close) => (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This permanently deletes the card, its comments and its activity.
            This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => {
              close();
              onConfirm();
            }}
            className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete card
          </button>
        </div>
      )}
    </Popover>
  );
}
