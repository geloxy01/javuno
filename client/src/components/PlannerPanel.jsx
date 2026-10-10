import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CalendarIcon } from "./barIcons";
import HeaderPopover from "./HeaderPopover";
import { ArrowLeftIcon } from "./icons";
import SidePanel from "./SidePanel";
import { getDueInfo, toDate, toDateInput } from "../lib/dates";
import {
  AGENDA_DAYS,
  CHIP_H,
  HOUR_H,
  MINUTES_PER_DAY,
  VIEWS,
  addDays,
  atMinutes,
  buildMonth,
  keepTimeOrNoon,
  layoutChips,
  minutesFromPointer,
  minutesOfDay,
  rangeLabel,
  sameDay,
  shiftCursor,
  startOfDay,
  startOfWeek,
} from "../lib/planner";

const VIEW_KEY = "javuno-planner-view";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GRID_H = 24 * HOUR_H;
const MONTH_MAX = 3;

const HOUR_LINES = `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_H - 1}px, rgba(148, 163, 184, 0.3) ${HOUR_H - 1}px, rgba(148, 163, 184, 0.3) ${HOUR_H}px)`;

const CHIP_TONES = {
  normal:
    "bg-javuno-light text-javuno-dark hover:bg-javuno/20 dark:bg-javuno/30 dark:text-white dark:hover:bg-javuno/40",
  soon: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  overdue: "bg-red-100 text-red-700 hover:bg-red-200",
  done: "bg-emerald-100 text-emerald-700 line-through hover:bg-emerald-200",
};

const timeLabel = (date) =>
  date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function readView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    if (VIEWS.some((v) => v.value === saved)) return saved;
  } catch {
    // ignore
  }
  return "week";
}

// Re-renders every minute, so the "now" line and the overdue colors stay current.
function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/* ---------- Draggable chip (a scheduled card) ---------- */

function DraggableChip({
  card,
  dimmed,
  onOpen,
  title,
  style,
  className = "",
  children,
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `planner:${card.id}`, // different from the board card's id, which is registered too
    data: { type: "chip", cardId: card.id },
  });
  const tone = getDueInfo(card)?.tone || "normal";

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card)}
      title={title}
      style={style}
      className={`touch-manipulation cursor-grab select-none truncate rounded-md px-1.5 py-1 text-left text-xs font-medium ring-1 ring-black/5 transition focus:outline-none focus:ring-2 focus:ring-javuno active:cursor-grabbing ${CHIP_TONES[tone]} ${
        dimmed ? "opacity-30" : ""
      } ${isDragging ? "opacity-40" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- Day and Week: time grid ---------- */

function TimeColumn({
  day,
  entries,
  now,
  matchIds,
  showTime,
  lists,
  onOpenCard,
}) {
  const nodeRef = useRef(null);
  const key = toDateInput(day);

  // Called when something is dropped here: the pointer height decides the time.
  const resolve = (point) => {
    const rect = nodeRef.current?.getBoundingClientRect();
    return rect ? atMinutes(day, minutesFromPointer(rect, point.y)) : null;
  };

  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${key}`,
    data: { type: "slot", resolve },
  });
  const setRefs = useCallback(
    (el) => {
      nodeRef.current = el;
      setNodeRef(el);
    },
    [setNodeRef],
  );

  // While something is dragged over this column, follow the pointer to show the drop time.
  const [hoverMinutes, setHoverMinutes] = useState(null);
  useEffect(() => {
    if (!isOver) {
      setHoverMinutes(null);
      return undefined;
    }
    let frame = 0;
    function onMove(e) {
      const point = e.touches?.[0] || e;
      if (typeof point.clientY !== "number") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = nodeRef.current?.getBoundingClientRect();
        if (rect) setHoverMinutes(minutesFromPointer(rect, point.clientY));
      });
    }
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("touchmove", onMove, {
      capture: true,
      passive: true,
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("touchmove", onMove, true);
    };
  }, [isOver]);

  const placed = useMemo(
    () =>
      layoutChips(
        entries.map((entry) => ({
          ...entry,
          top: Math.min(
            (minutesOfDay(entry.date) * HOUR_H) / 60,
            GRID_H - CHIP_H,
          ),
        })),
      ),
    [entries],
  );

  const listName = (card) =>
    lists.find((l) => l.id === card.listId)?.title ?? "";

  return (
    <div
      ref={setRefs}
      className={`relative min-w-0 flex-1 border-l border-slate-200 dark:border-slate-700 ${
        isOver ? "bg-javuno/10" : ""
      }`}
      style={{ height: GRID_H, backgroundImage: HOUR_LINES }}
    >
      {sameDay(day, now) && (
        <div
          className="pointer-events-none absolute inset-x-0 z-[5] h-0.5 bg-red-500"
          style={{ top: (minutesOfDay(now) * HOUR_H) / 60 }}
        >
          <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
        </div>
      )}

      {placed.map(({ card, date, top, lane, lanes }) => (
        <DraggableChip
          key={card.id}
          card={card}
          dimmed={Boolean(matchIds) && !matchIds.has(card.id)}
          onOpen={onOpenCard}
          title={`${card.title}${listName(card) ? ` · ${listName(card)}` : ""} · ${timeLabel(date)}`}
          style={{
            position: "absolute",
            top,
            height: CHIP_H,
            left: `calc(${(lane * 100) / lanes}% + 2px)`,
            width: `calc(${100 / lanes}% - 4px)`,
          }}
        >
          {showTime && lanes === 1 && (
            <span className="mr-1 opacity-70">{timeLabel(date)}</span>
          )}
          {card.title}
        </DraggableChip>
      ))}

      {hoverMinutes != null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-[6] border-t-2 border-javuno"
          style={{ top: (hoverMinutes * HOUR_H) / 60 }}
        >
          <span className="absolute left-1 top-0.5 rounded bg-javuno px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            {timeLabel(atMinutes(day, hoverMinutes))}
          </span>
        </div>
      )}
    </div>
  );
}

function TimeGrid({
  days,
  byDay,
  now,
  matchIds,
  showTime,
  minColWidth,
  lists,
  onOpenCard,
}) {
  const scrollRef = useRef(null);

  // Start the grid scrolled to the morning (or one hour before now, if today is visible).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hour = days.some((d) => sameDay(d, now))
      ? Math.max(0, now.getHours() - 1)
      : 7;
    el.scrollTop = hour * HOUR_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <div style={{ minWidth: 48 + days.length * minColWidth }}>
        <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          <div className="w-12 shrink-0" />
          {days.map((day) => {
            const isToday = sameDay(day, now);
            return (
              <div key={toDateInput(day)} className="flex-1 py-1.5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {WEEKDAYS[day.getDay()]}
                </p>
                <span
                  className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday ? "bg-javuno text-white" : ""
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex">
          <div className="relative w-12 shrink-0" style={{ height: GRID_H }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
              <span
                key={hour}
                className="absolute right-1.5 text-[10px] text-slate-400"
                style={{ top: hour * HOUR_H - 6 }}
              >
                {new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, {
                  hour: "numeric",
                })}
              </span>
            ))}
          </div>

          {days.map((day) => (
            <TimeColumn
              key={toDateInput(day)}
              day={day}
              entries={byDay[toDateInput(day)] || []}
              now={now}
              matchIds={matchIds}
              showTime={showTime}
              lists={lists}
              onOpenCard={onOpenCard}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Month ---------- */

function MonthCell({
  day,
  inMonth,
  isToday,
  entries,
  expanded,
  onToggle,
  matchIds,
  lists,
  onOpenCard,
}) {
  const key = toDateInput(day);
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${key}`,
    data: {
      type: "slot",
      resolve: (_point, card) => keepTimeOrNoon(day, card),
    },
  });

  const visible = expanded ? entries : entries.slice(0, MONTH_MAX);
  const hidden = entries.length - MONTH_MAX;
  const listName = (card) =>
    lists.find((l) => l.id === card.listId)?.title ?? "";

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[5.5rem] p-1 ${
        inMonth
          ? "bg-white dark:bg-slate-800"
          : "bg-slate-50 dark:bg-slate-900/60"
      } ${isOver ? "ring-2 ring-inset ring-javuno !bg-javuno-light dark:!bg-javuno/20" : ""}`}
    >
      <div className="mb-1 flex justify-end">
        <span
          className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
            isToday
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
        {visible.map(({ card, date }) => (
          <li key={card.id}>
            <DraggableChip
              card={card}
              dimmed={Boolean(matchIds) && !matchIds.has(card.id)}
              onOpen={onOpenCard}
              title={`${card.title}${listName(card) ? ` · ${listName(card)}` : ""} · ${timeLabel(date)}`}
              className="block w-full"
            >
              {card.title}
            </DraggableChip>
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 w-full rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-400 dark:hover:bg-slate-700"
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}

function MonthGrid({ cursor, byDay, today, matchIds, lists, onOpenCard }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const days = useMemo(
    () => buildMonth(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  function toggle(key) {
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-[420px]">
        <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
          {days.map((day) => {
            const key = toDateInput(day);
            return (
              <MonthCell
                key={key}
                day={day}
                inMonth={day.getMonth() === cursor.getMonth()}
                isToday={sameDay(day, today)}
                entries={byDay[key] || []}
                expanded={expanded.has(key)}
                onToggle={() => toggle(key)}
                matchIds={matchIds}
                lists={lists}
                onOpenCard={onOpenCard}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Agenda ---------- */

function AgendaDay({ day, isToday, entries, matchIds, lists, onOpenCard }) {
  const key = toDateInput(day);
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${key}`,
    data: {
      type: "slot",
      resolve: (_point, card) => keepTimeOrNoon(day, card),
    },
  });
  const listName = (card) =>
    lists.find((l) => l.id === card.listId)?.title ?? "";

  return (
    <section
      ref={setNodeRef}
      className={`rounded-xl px-3 py-2 ${isOver ? "bg-javuno-light ring-2 ring-javuno dark:bg-javuno/20" : ""}`}
    >
      <h3 className="text-sm">
        <span className={isToday ? "font-bold text-javuno" : "font-semibold"}>
          {day.toLocaleDateString(undefined, { weekday: "short" })}
        </span>{" "}
        <span className="text-slate-500 dark:text-slate-400">
          {day.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
        </span>
      </h3>

      {entries.length === 0 ? (
        <p className="mt-0.5 text-xs text-slate-400">Nothing planned</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {entries.map(({ card, date }) => (
            <li key={card.id}>
              <DraggableChip
                card={card}
                dimmed={Boolean(matchIds) && !matchIds.has(card.id)}
                onOpen={onOpenCard}
                title={card.title}
                className="block w-full"
              >
                <span className="mr-1.5 opacity-70">{timeLabel(date)}</span>
                {card.title}
                {listName(card) && (
                  <span className="ml-1.5 opacity-60">· {listName(card)}</span>
                )}
              </DraggableChip>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AgendaView({ cursor, byDay, today, matchIds, lists, onOpenCard }) {
  const start = startOfDay(cursor);
  const days = Array.from({ length: AGENDA_DAYS }, (_, i) => addDays(start, i));

  return (
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-2">
      {days.map((day) => (
        <AgendaDay
          key={toDateInput(day)}
          day={day}
          isToday={sameDay(day, today)}
          entries={byDay[toDateInput(day)] || []}
          matchIds={matchIds}
          lists={lists}
          onOpenCard={onOpenCard}
        />
      ))}
    </div>
  );
}

/* ---------- Date picker ---------- */

function MiniCalendar({ cursor, today, onPick, close }) {
  const [month, setMonth] = useState(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
  );
  const days = useMemo(
    () => buildMonth(month.getFullYear(), month.getMonth()),
    [month],
  );

  const navButton =
    "rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-300 dark:hover:bg-slate-700";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          aria-label="Previous month"
          className={navButton}
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {month.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          aria-label="Next month"
          className={navButton}
        >
          <ArrowLeftIcon className="h-4 w-4 rotate-180" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d.charAt(0)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const selected = sameDay(day, cursor);
          const inMonth = day.getMonth() === month.getMonth();
          return (
            <button
              key={toDateInput(day)}
              type="button"
              onClick={() => {
                onPick(day);
                close();
              }}
              className={`h-8 rounded-lg text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-javuno ${
                selected
                  ? "bg-javuno text-white"
                  : sameDay(day, today)
                    ? "text-javuno ring-1 ring-javuno hover:bg-javuno-light dark:hover:bg-slate-700"
                    : inMonth
                      ? "hover:bg-slate-100 dark:hover:bg-slate-700"
                      : "text-slate-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-700"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- The panel ---------- */

export default function PlannerPanel({
  cards,
  lists,
  matchIds,
  status, // 'loading' | 'error' | 'ready'
  boardVisible,
  onOpenCard,
  onClose,
}) {
  const [view, setView] = useState(readView);
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const now = useNow();
  const today = startOfDay(now);

  function changeView(next) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  }

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

  const scheduled = cards.filter((c) => toDate(c.dueDate)).length;
  const gridDays = useMemo(
    () =>
      view === "day"
        ? [cursor]
        : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)),
    [view, cursor],
  );

  const navButton =
    "rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-300 dark:hover:bg-slate-700";

  const toolbar = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <HeaderPopover
          align="left"
          label="Pick a date"
          title="Go to date"
          buttonClassName="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-100 dark:hover:bg-slate-700"
          trigger={
            <>
              <CalendarIcon className="h-4 w-4 text-javuno" />
              {rangeLabel(view, cursor)}
            </>
          }
        >
          {(close) => (
            <MiniCalendar
              cursor={cursor}
              today={today}
              onPick={setCursor}
              close={close}
            />
          )}
        </HeaderPopover>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(shiftCursor(view, cursor, -1))}
            aria-label="Previous"
            className={navButton}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(today)}
            className="btn-secondary !px-2.5 !py-1 !text-xs"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCursor(shiftCursor(view, cursor, 1))}
            aria-label="Next"
            className={navButton}
          >
            <ArrowLeftIcon className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>

      <div
        className="flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60"
        role="group"
        aria-label="Planner view"
      >
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => changeView(v.value)}
            aria-pressed={view === v.value}
            className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-javuno ${
              view === v.value
                ? "bg-javuno text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {status === "ready" && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {scheduled === 0
            ? boardVisible
              ? "Nothing scheduled yet. Drag a card from the board onto the calendar."
              : "Nothing scheduled yet. Open the Board panel and drag a card here."
            : `${scheduled} scheduled · ${cards.length - scheduled} without a due date`}
        </p>
      )}
    </div>
  );

  let body;
  if (status !== "ready") {
    body = (
      <p className="p-4 text-center text-sm text-slate-400">
        {status === "loading" ? "Loading…" : "Couldn't load the cards."}
      </p>
    );
  } else if (view === "month") {
    body = (
      <MonthGrid
        cursor={cursor}
        byDay={byDay}
        today={today}
        matchIds={matchIds}
        lists={lists}
        onOpenCard={onOpenCard}
      />
    );
  } else if (view === "agenda") {
    body = (
      <AgendaView
        cursor={cursor}
        byDay={byDay}
        today={today}
        matchIds={matchIds}
        lists={lists}
        onOpenCard={onOpenCard}
      />
    );
  } else {
    body = (
      <TimeGrid
        days={gridDays}
        byDay={byDay}
        now={now}
        matchIds={matchIds}
        showTime={view === "day"}
        minColWidth={view === "day" ? 160 : 112}
        lists={lists}
        onOpenCard={onOpenCard}
      />
    );
  }

  return (
    <SidePanel
      title="Planner"
      onClose={onClose}
      toolbar={toolbar}
      bodyClassName="flex flex-col overflow-hidden"
    >
      {body}
    </SidePanel>
  );
}
