import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { commitUpdates } from "./batch";
import { logActivity } from "./activity";

const cardsCol = (boardId) => collection(db, "boards", boardId, "cards");
const cardRef = (boardId, cardId) =>
  doc(db, "boards", boardId, "cards", cardId);

// All non-archived cards of a board, sorted by position. The page groups them by listId.
export function subscribeToCards(boardId, onData, onError) {
  return onSnapshot(
    cardsCol(boardId),
    (snap) => {
      const cards = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => !c.archived)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      onData(cards);
    },
    onError,
  );
}

export function createCard(
  boardId,
  user,
  listId,
  title,
  position,
  listName = "",
) {
  return addDoc(cardsCol(boardId), {
    listId,
    title,
    description: "",
    position,
    labelIds: [],
    memberIds: [],
    dueDate: null,
    dueComplete: false,
    checklists: [],
    coverColor: null,
    commentCount: 0,
    archived: false,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then((ref) => {
    logActivity(boardId, user, {
      type: "card_created",
      cardId: ref.id,
      data: { title, listName },
    });
    return ref;
  });
}

// Any field change from the card modal. `patch` may contain arrayUnion / arrayRemove / null values.
export function updateCard(boardId, cardId, patch) {
  return updateDoc(cardRef(boardId, cardId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

// Deletes the card and everything that belongs to it.
export async function deleteCard(boardId, cardId) {
  const refs = [];
  for (const name of ["comments", "activity"]) {
    const snap = await getDocs(
      query(
        collection(db, "boards", boardId, name),
        where("cardId", "==", cardId),
      ),
    );
    snap.docs.forEach((d) => refs.push(d.ref));
  }
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
  await deleteDoc(cardRef(boardId, cardId));
}

// Drag and drop: moving a card is one update of listId + position.
export function moveCard(boardId, cardId, listId, position) {
  return updateDoc(cardRef(boardId, cardId), {
    listId,
    position,
    updatedAt: serverTimestamp(),
  });
}

// Used when gaps get too small. entries: [{ id, listId, position }] for every card of the list, in order.
export function rebalanceCards(boardId, entries) {
  return commitUpdates(
    entries.map(({ id, listId, position }) => [
      cardRef(boardId, id),
      { listId, position, updatedAt: serverTimestamp() },
    ]),
  );
}
