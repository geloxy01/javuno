import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  describeActivity,
  logActivity,
  subscribeToCardActivity,
} from "../lib/activity";
import {
  addComment,
  deleteComment,
  editComment,
  subscribeToCardComments,
} from "../lib/comments";
import { formatWhen, millis } from "../lib/dates";

function Avatar({ name, photoURL }) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-javuno text-xs font-semibold text-white">
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function CommentItem({ comment, mine, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);

  function startEdit() {
    setDraft(comment.text);
    setEditing(true);
  }

  function save() {
    const text = draft.trim();
    setEditing(false);
    if (text && text !== comment.text) onEdit(comment, text);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
  }

  return (
    <li className="flex gap-3">
      <Avatar name={comment.authorName} photoURL={comment.authorPhotoURL} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {comment.authorName}
          </span>{" "}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatWhen(comment.createdAt)}
            {comment.editedAt ? " (edited)" : ""}
          </span>
        </p>

        {editing ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              maxLength={4000}
              aria-label="Edit comment"
              className="input"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={!draft.trim()}
                className="btn-primary !px-3 !py-1.5"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-secondary !px-3 !py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-black/5 dark:bg-slate-800 dark:text-slate-100 dark:ring-white/10">
              {comment.text}
            </p>
            {mine && (
              <div className="mt-1 flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-javuno"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this comment?"))
                      onDelete(comment);
                  }}
                  className="rounded underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-javuno"
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function CardActivity({ boardId, card }) {
  const { user } = useAuth();
  const { showError } = useToast();
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [draft, setDraft] = useState("");
  const composerRef = useRef(null);

  useEffect(() => {
    setComments([]);
    setActivity([]);
    const unsubscribeComments = subscribeToCardComments(
      boardId,
      card.id,
      setComments,
      (err) => console.error(err),
    );
    const unsubscribeActivity = subscribeToCardActivity(
      boardId,
      card.id,
      setActivity,
      (err) => console.error(err),
    );
    return () => {
      unsubscribeComments();
      unsubscribeActivity();
    };
  }, [boardId, card.id]);

  const feed = useMemo(
    () =>
      [
        ...comments.map((c) => ({
          kind: "comment",
          key: `c-${c.id}`,
          when: millis(c.createdAt),
          item: c,
        })),
        ...activity
          .filter((a) => a.type !== "comment_added") // the comment itself is already in the feed
          .map((a) => ({
            kind: "activity",
            key: `a-${a.id}`,
            when: millis(a.createdAt),
            item: a,
          })),
      ].sort((a, b) => b.when - a.when),
    [comments, activity],
  );

  function submitComment() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    addComment(boardId, user, card.id, text)
      .then(() =>
        logActivity(boardId, user, { type: "comment_added", cardId: card.id }),
      )
      .catch((err) => {
        setDraft(text);
        showError("Could not post the comment.", err);
      });
  }

  function handleComposerKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitComment();
    } else if (e.key === "Escape") {
      e.preventDefault();
      composerRef.current?.blur();
    }
  }

  function handleEdit(comment, text) {
    editComment(boardId, comment.id, text).catch((err) =>
      showError("Could not edit the comment.", err),
    );
  }

  function handleDelete(comment) {
    deleteComment(boardId, card.id, comment.id).catch((err) =>
      showError("Could not delete the comment.", err),
    );
  }

  return (
    <div>
      <div className="flex gap-3">
        <Avatar
          name={user.displayName || user.email}
          photoURL={user.photoURL}
        />
        <div className="min-w-0 flex-1">
          <textarea
            ref={composerRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            rows={2}
            maxLength={4000}
            placeholder="Write a comment…"
            aria-label="Write a comment"
            className="input"
          />
          {draft.trim() && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={submitComment}
                className="btn-primary !px-3 !py-1.5"
              >
                Save
              </button>
              <span className="text-xs text-slate-400">Ctrl+Enter to save</span>
            </div>
          )}
        </div>
      </div>

      <ul className="mt-5 space-y-4">
        {feed.map((entry) =>
          entry.kind === "comment" ? (
            <CommentItem
              key={entry.key}
              comment={entry.item}
              mine={entry.item.authorId === user.uid}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <li key={entry.key} className="flex gap-3">
              <Avatar name={entry.item.actorName} />
              <p className="min-w-0 flex-1 pt-0.5 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {entry.item.actorName}
                </span>{" "}
                {describeActivity(entry.item)}
                <span className="block text-xs text-slate-400">
                  {formatWhen(entry.item.createdAt)}
                </span>
              </p>
            </li>
          ),
        )}
      </ul>

      {feed.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">
          No comments or activity yet.
        </p>
      )}
    </div>
  );
}
