import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { logActivity } from "./activity";
import { deleteCard, updateCard } from "./cards";
import { millis } from "./dates";

// Most recently archived first. Archiving sets updatedAt, so it doubles as the archive time.
const byRecent = (a, b) => millis(b.updatedAt) - millis(a.updatedAt);

function subscribeToArchived(boardId, name, onData, onError) {
  return onSnapshot(
    query(
      collection(db, "boards", boardId, name),
      where("archived", "==", true),
    ),
    (snap) =>
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byRecent)),
    onError,
  );
}

export function subscribeToArchivedCards(boardId, onData, onError) {
  return subscribeToArchived(boardId, "cards", onData, onError);
}

export function subscribeToArchivedLists(boardId, onData, onError) {
  return subscribeToArchived(boardId, "lists", onData, onError);
}

// Puts the card back (in `listId`, at `position`) and records it in the card's activity.
export async function restoreCard(
  boardId,
  user,
  card,
  listId,
  position,
  listName,
) {
  await updateCard(boardId, card.id, { archived: false, listId, position });
  logActivity(boardId, user, {
    type: "card_restored",
    cardId: card.id,
    data: { listName },
  });
}

export function restoreList(boardId, listId, position) {
  return updateDoc(doc(db, "boards", boardId, "lists", listId), {
    archived: false,
    position,
    updatedAt: serverTimestamp(),
  });
}

// Deletes the list and every card in it (archived or not), with their comments and activity.
export async function deleteListForever(boardId, listId) {
  const snap = await getDocs(
    query(
      collection(db, "boards", boardId, "cards"),
      where("listId", "==", listId),
    ),
  );
  for (const cardDoc of snap.docs) {
    await deleteCard(boardId, cardDoc.id);
  }
  await deleteDoc(doc(db, "boards", boardId, "lists", listId));
}

export { deleteCard as deleteCardForever };
