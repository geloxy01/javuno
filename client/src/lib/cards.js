import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const cardsCol = (boardId) => collection(db, "boards", boardId, "cards");

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

export function createCard(boardId, user, listId, title, position) {
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
  });
}
