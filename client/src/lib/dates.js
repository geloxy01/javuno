export const DAY_MS = 24 * 60 * 60 * 1000;

export const DUE_TONES = {
  normal: "bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-100",
  soon: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-700",
  done: "bg-emerald-100 text-emerald-700",
};

// Firestore Timestamp (or Date) -> Date, or null.
export function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  return ts instanceof Date ? ts : null;
}

// Milliseconds for sorting. A write that is still pending has no server time yet, so it sorts as newest.
export function millis(ts) {
  const d = toDate(ts);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

export function getDueInfo(card) {
  const date = toDate(card.dueDate);
  if (!date) return null;

  const diff = date.getTime() - Date.now();
  let tone = "normal";
  let status = null;
  if (card.dueComplete) {
    tone = "done";
    status = "Complete";
  } else if (diff < 0) {
    tone = "overdue";
    status = "Overdue";
  } else if (diff < DAY_MS) {
    tone = "soon";
    status = "Due soon";
  }

  return {
    date,
    tone,
    status,
    shortLabel: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    fullLabel: date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

const pad = (n) => String(n).padStart(2, "0");

export function toDateInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInput(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatWhen(ts) {
  const d = toDate(ts);
  if (!d) return "just now";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
