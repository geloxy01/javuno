import { toDate } from "./dates";

export const HOUR_H = 44; // pixels per hour in the Day and Week grids
export const CHIP_H = 26; // pixels per chip in the time grid
export const SNAP_MINUTES = 15;
export const MINUTES_PER_DAY = 24 * 60;
export const AGENDA_DAYS = 14;

export const VIEWS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "agenda", label: "Agenda" },
];

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, count) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

// Weeks start on Sunday.
export function startOfWeek(date) {
  return addDays(date, -date.getDay());
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function atMinutes(day, minutes) {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  );
}

// Pointer height inside a day column -> minutes after midnight, snapped to 15 minutes.
export function minutesFromPointer(rect, clientY) {
  const raw = ((clientY - rect.top) / HOUR_H) * 60;
  const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.min(MINUTES_PER_DAY - SNAP_MINUTES, Math.max(0, snapped));
}

// Dropping on a whole day (Month, Agenda) keeps the card's time, or uses noon if it has no due date yet.
export function keepTimeOrNoon(day, card) {
  const existing = toDate(card.dueDate);
  return existing
    ? atMinutes(day, minutesOfDay(existing))
    : atMinutes(day, 12 * 60);
}

// 5 or 6 weeks of days, starting on the Sunday on or before the 1st.
export function buildMonth(year, month) {
  const first = new Date(year, month, 1);
  const cells = Array.from(
    { length: 42 },
    (_, i) => new Date(year, month, 1 - first.getDay() + i),
  );
  return cells.slice(0, cells[35].getMonth() === month ? 42 : 35);
}

export function shiftCursor(view, cursor, direction) {
  switch (view) {
    case "day":
      return addDays(cursor, direction);
    case "week":
      return addDays(cursor, 7 * direction);
    case "month":
      return new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
    default:
      return addDays(cursor, AGENDA_DAYS * direction);
  }
}

function spanLabel(start, end) {
  const monthDay = { month: "short", day: "numeric" };
  if (start.getFullYear() !== end.getFullYear()) {
    const full = { ...monthDay, year: "numeric" };
    return `${start.toLocaleDateString(undefined, full)} – ${end.toLocaleDateString(undefined, full)}`;
  }
  const tail =
    start.getMonth() === end.getMonth()
      ? String(end.getDate())
      : end.toLocaleDateString(undefined, monthDay);
  return `${start.toLocaleDateString(undefined, monthDay)} – ${tail}, ${end.getFullYear()}`;
}

export function rangeLabel(view, cursor) {
  switch (view) {
    case "day":
      return cursor.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "week": {
      const start = startOfWeek(cursor);
      return spanLabel(start, addDays(start, 6));
    }
    case "month":
      return cursor.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    default: {
      const start = startOfDay(cursor);
      return spanLabel(start, addDays(start, AGENDA_DAYS - 1));
    }
  }
}

// Entries of one day, sorted by time: [{ card, date, top }]. Chips that would overlap are
// placed side by side. Returns [{ ...entry, lane, lanes }].
export function layoutChips(entries) {
  const out = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  function flush() {
    const laneEnds = [];
    const placed = cluster.map((entry) => {
      let lane = laneEnds.findIndex((end) => end <= entry.top);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = entry.top + CHIP_H;
      return { ...entry, lane };
    });
    placed.forEach((entry) => out.push({ ...entry, lanes: laneEnds.length }));
    cluster = [];
    clusterEnd = -Infinity;
  }

  entries.forEach((entry) => {
    if (cluster.length > 0 && entry.top >= clusterEnd) flush();
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.top + CHIP_H);
  });
  if (cluster.length > 0) flush();

  return out;
}
