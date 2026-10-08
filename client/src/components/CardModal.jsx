import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Timestamp, arrayRemove, arrayUnion } from "firebase/firestore";
import Avatar from "./Avatar";
import CardActivity from "./CardActivity";
import { CardMembersPopover } from "./CardMembersPopover";
import Checklists from "./Checklists";
import DescriptionEditor from "./DescriptionEditor";
import { SIDEBAR_BUTTON } from "./Popover";
import {
  ChecklistPopover,
  CoverPopover,
  DatesPopover,
  DeletePopover,
  LabelsPopover,
} from "./CardPopovers";
import { ClockIcon, ArchiveIcon, XIcon } from "./icons";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { logActivity } from "../lib/activity";
import { deleteCard, updateCard } from "../lib/cards";
import { DUE_TONES, getDueInfo } from "../lib/dates";
import { newId } from "../lib/id";
import { notifyCardAssigned } from "../lib/notifications";

const sectionHeading =
  "text-sm font-semibold text-slate-700 dark:text-slate-200";
const sidebarHeading =
  "mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 first:mt-0";

function TitleField({ value, onSave }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);
  const focused = useRef(false);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  // Grow the textarea with its content.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [draft]);

  function commit() {
    focused.current = false;
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value);
      return;
    }
    const title = draft.replace(/\s+/g, " ").trim();
    if (title && title !== value) onSave(title);
    else setDraft(value);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelled.current = true;
      e.currentTarget.blur();
    }
  }

  return (
    <textarea
      ref={ref}
      value={draft}
      rows={1}
      maxLength={200}
      aria-label="Card title"
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="w-full resize-none rounded-lg border-2 border-transparent bg-transparent px-2 py-1 text-xl font-bold text-slate-800 outline-none transition hover:bg-slate-200/50 focus:border-javuno focus:bg-white dark:text-slate-100 dark:hover:bg-slate-700/50 dark:focus:bg-slate-800"
    />
  );
}

export default function CardModal({
  boardId,
  boardTitle,
  card,
  lists,
  labels,
  members,
  onClose,
}) {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  // Esc closes the modal, unless a popover or a field already used it.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        el.blur();
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleBackdropMouseDown(e) {
    if (e.target === e.currentTarget) onClose();
  }

  // ----- Card not available (deleted or archived elsewhere) -----
  if (!card) {
    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
        onMouseDown={handleBackdropMouseDown}
        role="dialog"
        aria-modal="true"
        aria-label="Card not found"
      >
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-800">
          <h2 className="text-lg font-bold">Card not available</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            This card was deleted, archived or never existed.
          </p>
          <button type="button" onClick={onClose} className="btn-primary mt-5">
            Back to the board
          </button>
        </div>
      </div>
    );
  }

  const list = lists.find((l) => l.id === card.listId);
  const due = getDueInfo(card);
  const labelsById = Object.fromEntries(labels.map((l) => [l.id, l]));
  const membersById = Object.fromEntries(members.map((m) => [m.uid, m]));
  const cardLabels = (card.labelIds || [])
    .map((id) => labelsById[id])
    .filter(Boolean);
  const assignedMembers = (card.memberIds || [])
    .map((id) => membersById[id])
    .filter(Boolean);
  const checklists = card.checklists || [];

  // ----- Actions -----
  const act = (type, data) =>
    logActivity(boardId, user, { type, cardId: card.id, data });

  function save(patch, failureMessage, then) {
    updateCard(boardId, card.id, patch)
      .then(() => then?.())
      .catch((err) => showError(failureMessage, err));
  }

  function handleRename(title) {
    save({ title }, "Could not rename the card.", () =>
      act("card_renamed", { from: card.title, to: title }),
    );
  }

  function handleDescription(description) {
    save({ description }, "Could not save the description.", () =>
      act("description_updated"),
    );
  }

  function handleToggleLabel(label, assigned) {
    save(
      { labelIds: assigned ? arrayRemove(label.id) : arrayUnion(label.id) },
      "Could not update the labels.",
      () =>
        act(assigned ? "label_removed" : "label_added", { name: label.name }),
    );
  }

  function handleToggleMember(person, assigned) {
    save(
      {
        memberIds: assigned ? arrayRemove(person.uid) : arrayUnion(person.uid),
      },
      "Could not update the members.",
      () => {
        act(assigned ? "member_removed" : "member_added", {
          name: person.displayName,
        });
        if (!assigned)
          notifyCardAssigned(boardId, boardTitle, user, card, person);
      },
    );
  }

  function handleSaveDue(date) {
    save(
      { dueDate: Timestamp.fromDate(date), dueComplete: false },
      "Could not save the due date.",
      () =>
        act("due_set", {
          dueLabel: date.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        }),
    );
  }

  function handleRemoveDue() {
    save(
      { dueDate: null, dueComplete: false },
      "Could not remove the due date.",
      () => act("due_removed"),
    );
  }

  function handleDueComplete(complete) {
    save({ dueComplete: complete }, "Could not update the due date.", () =>
      act("due_complete", { complete }),
    );
  }

  function handleChecklists(next) {
    save({ checklists: next }, "Could not update the checklist.");
  }

  function handleAddChecklist(title) {
    save(
      { checklists: [...checklists, { id: newId(), title, items: [] }] },
      "Could not add the checklist.",
      () => act("checklist_added", { title }),
    );
  }

  function handleRemoveChecklist(checklist) {
    save(
      { checklists: checklists.filter((c) => c.id !== checklist.id) },
      "Could not delete the checklist.",
      () => act("checklist_removed", { title: checklist.title }),
    );
  }

  function handleCover(color) {
    save({ coverColor: color }, "Could not change the cover.");
  }

  // Close first so the "card not available" screen never flashes, then write.
  function handleArchive() {
    onClose();
    updateCard(boardId, card.id, { archived: true })
      .then(() => {
        act("card_archived");
        showSuccess("Card archived.");
      })
      .catch((err) => showError("Could not archive the card.", err));
  }

  function handleDelete() {
    onClose();
    deleteCard(boardId, card.id)
      .then(() => showSuccess("Card deleted."))
      .catch((err) => showError("Could not delete the card.", err));
  }

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-black/60 px-3 py-6 sm:py-10"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
      aria-label={card.title}
    >
      <div className="relative mx-auto w-full max-w-4xl rounded-2xl bg-slate-50 shadow-2xl dark:bg-slate-900">
        {card.coverColor && (
          <div
            className="h-24 rounded-t-2xl"
            style={{ background: card.coverColor }}
          />
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close card"
          title="Close (Esc)"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/10 p-1.5 text-slate-700 transition hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-javuno dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20"
        >
          <XIcon />
        </button>

        <div className="p-5 sm:p-6">
          <div className="pr-10">
            <TitleField value={card.title} onSave={handleRename} />
            <p className="mt-1 px-2 text-sm text-slate-500 dark:text-slate-400">
              in list{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {list?.title ?? "Unknown list"}
              </span>
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_12rem]">
            {/* ---------- Left: content ---------- */}
            <div className="min-w-0 space-y-6">
              {(assignedMembers.length > 0 || cardLabels.length > 0 || due) && (
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  {assignedMembers.length > 0 && (
                    <section>
                      <h3 className={sectionHeading}>Members</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {assignedMembers.map((m) => (
                          <span
                            key={m.uid}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                          >
                            <Avatar
                              name={m.displayName}
                              photoURL={m.photoURL}
                              className="h-6 w-6"
                              textClass="text-[10px]"
                            />
                            {m.displayName}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {cardLabels.length > 0 && (
                    <section>
                      <h3 className={sectionHeading}>Labels</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {cardLabels.map((label) => (
                          <span
                            key={label.id}
                            style={{ background: label.color }}
                            className="min-w-[2.5rem] rounded-md px-3 py-1 text-xs font-semibold text-white"
                          >
                            {label.name || "\u00a0"}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {due && (
                    <section>
                      <h3 className={sectionHeading}>Due date</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(card.dueComplete)}
                          onChange={(e) => handleDueComplete(e.target.checked)}
                          aria-label="Mark the due date as complete"
                          className="h-4 w-4 cursor-pointer accent-javuno"
                        />
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium ${DUE_TONES[due.tone]}`}
                        >
                          <ClockIcon className="h-4 w-4" />
                          {due.fullLabel}
                          {due.status && (
                            <span className="rounded bg-white/60 px-1.5 text-[10px] font-bold uppercase tracking-wide">
                              {due.status}
                            </span>
                          )}
                        </span>
                      </div>
                    </section>
                  )}
                </div>
              )}

              <section>
                <h3 className={`${sectionHeading} mb-2`}>Description</h3>
                <DescriptionEditor
                  value={card.description}
                  onSave={handleDescription}
                />
              </section>

              {checklists.length > 0 && (
                <section>
                  <h3 className={`${sectionHeading} mb-3`}>Checklists</h3>
                  <Checklists
                    checklists={checklists}
                    onChange={handleChecklists}
                    onRemove={handleRemoveChecklist}
                  />
                </section>
              )}

              <section>
                <h3 className={`${sectionHeading} mb-3`}>
                  Comments and activity
                </h3>
                <CardActivity boardId={boardId} card={card} />
              </section>
            </div>

            {/* ---------- Right: actions ---------- */}
            <aside className="order-first space-y-2 md:order-none">
              <h3 className={sidebarHeading}>Add to card</h3>
              <CardMembersPopover
                members={members}
                card={card}
                onToggle={handleToggleMember}
              />
              <LabelsPopover
                boardId={boardId}
                labels={labels}
                card={card}
                onToggle={handleToggleLabel}
              />
              <DatesPopover
                card={card}
                onSave={handleSaveDue}
                onRemove={handleRemoveDue}
              />
              <ChecklistPopover onAdd={handleAddChecklist} />
              <CoverPopover card={card} onChange={handleCover} />

              <h3 className={sidebarHeading}>Actions</h3>
              <button
                type="button"
                onClick={handleArchive}
                className={SIDEBAR_BUTTON}
              >
                <ArchiveIcon />
                Archive
              </button>
              <DeletePopover onConfirm={handleDelete} />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
