import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { millis } from "./dates";

const activityCol = (boardId) => collection(db, "boards", boardId, "activity");

// Fire-and-forget. Never rejects, so logging problems cannot undo a real change.
export function logActivity(boardId, user, { type, cardId = null, data = {} }) {
  return addDoc(activityCol(boardId), {
    type,
    cardId,
    data: JSON.parse(JSON.stringify(data)), // drops undefined values, which Firestore rejects
    actorId: user.uid,
    actorName: user.displayName || user.email?.split("@")[0] || "Someone",
    createdAt: serverTimestamp(),
  }).catch((err) => {
    console.warn("Could not log activity", err);
  });
}

// Newest first.
export function subscribeToCardActivity(boardId, cardId, onData, onError) {
  return onSnapshot(
    query(activityCol(boardId), where("cardId", "==", cardId)),
    (snap) => {
      const entries = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
      onData(entries);
    },
    onError,
  );
}

export function describeActivity(entry) {
  const d = entry.data || {};
  switch (entry.type) {
    case "card_created":
      return `added this card to ${d.listName || "a list"}`;
    case "card_moved":
      return `moved this card from ${d.from || "a list"} to ${d.to || "another list"}`;
    case "card_renamed":
      return `renamed this card from "${d.from}" to "${d.to}"`;
    case "description_updated":
      return "updated the description";
    case "due_set":
      return `set the due date to ${d.dueLabel}`;
    case "due_removed":
      return "removed the due date";
    case "due_complete":
      return d.complete
        ? "marked the due date as complete"
        : "marked the due date as incomplete";
    case "checklist_added":
      return `added the checklist "${d.title}"`;
    case "checklist_removed":
      return `removed the checklist "${d.title}"`;
    case "label_added":
      return `added the label "${d.name || "unnamed"}"`;
    case "label_removed":
      return `removed the label "${d.name || "unnamed"}"`;
    case "member_added":
      return `added ${d.name || "a member"} to this card`;
    case "member_removed":
      return `removed ${d.name || "a member"} from this card`;
    case "card_archived":
      return "archived this card";
    case "card_restored":
      return `restored this card from the archive${d.listName ? ` to ${d.listName}` : ""}`;
    default:
      return entry.type;
  }
}
