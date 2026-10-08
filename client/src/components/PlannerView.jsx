import { useMemo, useState } from "react";
import { ArrowLeftIcon } from "./icons";
import { getDueInfo, toDate, toDateInput } from "../lib/dates";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

const CHIP_TONES = {
  normal:
    "bg-javuno-light text-javuno-dark hover:bg-javuno/20 dark:bg-javuno/30 dark:text-white dark:hover:bg-javuno/40",
  soon: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  overdue: "bg-red-100 text-red-700 hover:bg-red-200",
  done: "bg-emerald-100 text-emerald-700 line-through hover:bg-emerald-200",
};

// 5 or 6 weeks of days, starting on the Sunday on or before the 1st.
function buildMonth(year, month) {
  const first = new Date(year, month, 1);
  const cells = Array.from(
    { length: 42 },
    (_, i) => new Date(year, month, 1 - first.getDay() + i),
  );
  return cells.slice(0, cells[35].getMonth() === month ? 42 : 35);
}

export default function PlannerView({ cards, lists, matchIds, onOpenCard }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [expanded, setExpanded] = useState(() => new Set());

  // Cards grouped by local due day, earliest first.
  const byDay = useMemo(() => {
    const map = {};
    cards.forEach((card) => {
      const date = toDate(card.dueDate);
      if (!date) return;
      const key = toDateInput(date);
      if (!map[key]) map[key] = [];
      map[key].push({ card, date });
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.date - b.date));
    return map;
  }, [cards]);

  const days = useMemo(() => buildMonth(cursor.y, cursor.m), [cursor]);
  const todayKey = toDateInput(new Date());
  const scheduledTotal = cards.filter((c) => toDate(c.dueDate)).length;
  const dueThisMonth = days
    .filter((d) => d.getMonth() === cursor.m)
    .reduce((sum, d) => sum + (byDay[toDateInput(d)]?.length || 0), 0);

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(
    undefined,
    {
      month: "long",
      year: "numeric",
    },
  );
  const listName = (card) =>
    lists.find((l) => l.id === card.listId)?.title ?? "";

  function shift(delta) {
    setCursor(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  }

  function toggleDay(key) {
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const navButton =
    "rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-300 dark:hover:bg-slate-700";

  return (
    <div className="px-3 pb-24 pt-3 sm:px-4">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-white/95 shadow-soft dark:bg-slate-800/95">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-lg font-bold">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className={navButton}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className={navButton}
            >
              <ArrowLeftIcon className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCursor({ y: now.getFullYear(), m: now.getMonth() });
              }}
              className="btn-secondary !px-3 !py-1.5"
            >
              Today
            </button>
          </div>
          <p className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            {dueThisMonth} due this month · {cards.length - scheduledTotal}{" "}
            without a due date
          </p>
        </header>

        {scheduledTotal === 0 && (
          <p className="border-b border-slate-200 bg-javuno-light/60 px-4 py-2.5 text-sm text-javuno-dark dark:border-slate-700 dark:bg-javuno/10 dark:text-slate-200">
            No cards have a due date yet. Open a card and use{" "}
            <strong>Dates</strong> to put it on the calendar.
          </p>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
              {days.map((day) => {
                const key = toDateInput(day);
                const inMonth = day.getMonth() === cursor.m;
                const entries = byDay[key] || [];
                const isOpen = expanded.has(key);
                const visible = isOpen
                  ? entries
                  : entries.slice(0, MAX_VISIBLE);
                const hidden = entries.length - MAX_VISIBLE;

                return (
                  <div
                    key={key}
                    className={`min-h-[6.5rem] p-1.5 ${
                      inMonth
                        ? "bg-white dark:bg-slate-800"
                        : "bg-slate-50 dark:bg-slate-900/60"
                    }`}
                  >
                    <div className="mb-1 flex justify-end">
                      <span
                        className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-semibold ${
                          key === todayKey
                            ? "bg-javuno text-white"
                            : inMonth
                              ? "text-slate-700 dark:text-slate-200"
                              : "text-slate-400 dark:text-slate-600"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>

                    <ul className="space-y-1">
                      {visible.map(({ card, date }) => {
                        const tone = getDueInfo(card)?.tone || "normal";
                        const dim =
                          matchIds && !matchIds.has(card.id)
                            ? "opacity-30"
                            : "";
                        const time = date.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return (
                          <li key={card.id}>
                            <button
                              type="button"
                              onClick={() => onOpenCard(card)}
                              title={`${card.title}${listName(card) ? ` · ${listName(card)}` : ""} · ${time}`}
                              className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-javuno ${CHIP_TONES[tone]} ${dim}`}
                            >
                              <span className="mr-1 hidden opacity-70 xl:inline">
                                {time}
                              </span>
                              {card.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {hidden > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleDay(key)}
                        className="mt-1 w-full rounded-md px-1.5 py-0.5 text-left text-xs font-semibold text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        {isOpen ? "Show less" : `+${hidden} more`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
