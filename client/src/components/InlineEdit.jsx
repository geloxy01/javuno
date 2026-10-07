import { useEffect, useRef, useState } from "react";

export default function InlineEdit({
  value,
  onSave,
  className = "",
  inputClassName = "",
  maxLength = 100,
  label = "Rename",
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);
  const cancelled = useRef(false);

  // Keep the draft in sync with live updates while not editing.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      setEditing(false);
      setDraft(value);
      return;
    }
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.currentTarget.blur(); // blur triggers commit()
    } else if (e.key === "Escape") {
      cancelled.current = true;
      e.currentTarget.blur();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        maxLength={maxLength}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        className={inputClassName}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to rename"
      className={className}
    >
      {value}
    </button>
  );
}
