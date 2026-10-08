import { forwardRef } from "react";
import { CheckSquareIcon, ClockIcon, CommentIcon } from "./icons";

const DUE_TONES = {
  normal: "text-slate-600 bg-slate-100 dark:bg-slate-600 dark:text-slate-100",
  soon: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-700",
  done: "bg-emerald-100 text-emerald-700",
};

function getDue(card) {
  const date = card.dueDate?.toDate ? card.dueDate.toDate() : null;
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  let tone = "normal";
  if (card.dueComplete) tone = "done";
  else if (diff < 0) tone = "overdue";
  else if (diff < 24 * 60 * 60 * 1000) tone = "soon";
  return {
    tone,
    label: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  };
}

function getChecklistProgress(card) {
  let total = 0;
  let done = 0;
  (card.checklists || []).forEach((checklist) => {
    (checklist.items || []).forEach((item) => {
      total += 1;
      if (item.done) done += 1;
    });
  });
  return { total, done };
}

const CardItem = forwardRef(function CardItem(
  { card, isOverlay = false, isPlaceholder = false, onClick, style, ...rest },
  ref,
) {
  const due = getDue(card);
  const { total, done } = getChecklistProgress(card);
  const comments = card.commentCount || 0;
  const hasBadges = Boolean(due) || total > 0 || comments > 0;

  let surface;
  if (isPlaceholder) {
    surface = "bg-javuno/10 ring-2 ring-inset ring-javuno/30 dark:bg-javuno/20";
  } else if (isOverlay) {
    surface =
      "drag-pickup cursor-grabbing bg-white shadow-2xl ring-1 ring-javuno/60 dark:bg-slate-700";
  } else {
    surface =
      "cursor-grab bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-px hover:shadow-md hover:ring-javuno/40 active:cursor-grabbing dark:bg-slate-700 dark:ring-white/10";
  }

  return (
    <article
      ref={ref}
      style={style}
      onClick={onClick}
      {...rest}
      className={`group touch-manipulation select-none overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-javuno ${surface}`}
    >
      <div className={isPlaceholder ? "invisible" : ""}>
        {card.coverColor && (
          <div className="h-2" style={{ background: card.coverColor }} />
        )}
        <div className="px-3 py-2.5">
          <p className="break-words text-sm text-slate-800 dark:text-slate-100">
            {card.title}
          </p>

          {hasBadges && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium">
              {due && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${DUE_TONES[due.tone]}`}
                >
                  <ClockIcon />
                  {due.label}
                </span>
              )}
              {total > 0 && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                    done === total
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-100"
                  }`}
                >
                  <CheckSquareIcon />
                  {done}/{total}
                </span>
              )}
              {comments > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-600 dark:text-slate-100">
                  <CommentIcon />
                  {comments}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

export default CardItem;
