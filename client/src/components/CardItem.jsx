import { forwardRef } from "react";
import Avatar from "./Avatar";
import { CheckSquareIcon, ClockIcon, CommentIcon } from "./icons";
import { DUE_TONES, getDueInfo } from "../lib/dates";

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
  {
    card,
    labelsById = {},
    membersById = {},
    dimmed = false,
    isOverlay = false,
    isPlaceholder = false,
    onClick,
    style,
    ...rest
  },
  ref,
) {
  const due = getDueInfo(card);
  const { total, done } = getChecklistProgress(card);
  const comments = card.commentCount || 0;
  const labels = (card.labelIds || [])
    .map((id) => labelsById[id])
    .filter(Boolean);
  const members = (card.memberIds || [])
    .map((id) => membersById[id])
    .filter(Boolean);
  const hasBadges =
    Boolean(due) || total > 0 || comments > 0 || members.length > 0;

  let surface;
  if (isPlaceholder) {
    surface = "bg-javuno/10 ring-2 ring-inset ring-javuno/30 dark:bg-javuno/20";
  } else if (isOverlay) {
    surface =
      "drag-pickup cursor-grabbing bg-white shadow-2xl ring-1 ring-javuno/60 dark:bg-slate-700";
  } else {
    surface =
      "cursor-pointer bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-px hover:shadow-md hover:ring-javuno/40 dark:bg-slate-700 dark:ring-white/10";
  }
  const dim =
    dimmed && !isOverlay && !isPlaceholder ? "opacity-30 hover:opacity-70" : "";

  return (
    <article
      ref={ref}
      style={style}
      onClick={onClick}
      {...rest}
      className={`group touch-manipulation select-none overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-javuno ${surface} ${dim}`}
    >
      <div className={isPlaceholder ? "invisible" : ""}>
        {card.coverColor && (
          <div className="h-9" style={{ background: card.coverColor }} />
        )}
        <div className="px-3 py-2.5">
          {labels.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {labels.map((label) => (
                <span
                  key={label.id}
                  title={label.name || undefined}
                  style={{ background: label.color }}
                  className="h-2 w-9 rounded-full"
                />
              ))}
            </div>
          )}

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
                  {due.shortLabel}
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
              {members.length > 0 && (
                <span className="ml-auto flex -space-x-1.5">
                  {members.slice(0, 3).map((m) => (
                    <Avatar
                      key={m.uid}
                      name={m.displayName}
                      photoURL={m.photoURL}
                      className="h-6 w-6"
                      textClass="text-[10px]"
                      ring="ring-2 ring-white dark:ring-slate-700"
                    />
                  ))}
                  {members.length > 3 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white dark:bg-slate-600 dark:text-slate-100 dark:ring-slate-700">
                      +{members.length - 3}
                    </span>
                  )}
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
