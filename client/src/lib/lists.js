import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const listsCol = (boardId) => collection(db, "boards", boardId, "lists");

export function subscribeToLists(boardId, onData, onError) {
  return onSnapshot(
    listsCol(boardId),
    (snap) => {
      const lists = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => !l.archived)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      onData(lists);
    },
    onError,
  );
}

export function createList(boardId, title, position) {
  return addDoc(listsCol(boardId), {
    title,
    position,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function renameList(boardId, listId, title) {
  return updateDoc(doc(db, "boards", boardId, "lists", listId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

export function archiveList(boardId, listId) {
  return updateDoc(doc(db, "boards", boardId, "lists", listId), {
    archived: true,
    updatedAt: serverTimestamp(),
  });
}

// Copies a list and all of its (non-archived) cards to a new list at `position`.
export async function copyList(boardId, user, list, cards, position) {
  const newListRef = doc(listsCol(boardId));
  const cardsCol = collection(db, "boards", boardId, "cards");

  const ops = [
    [
      newListRef,
      {
        title: `${list.title} (copy)`,
        position,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ],
    ...cards.map((card) => [
      doc(cardsCol),
      {
        listId: newListRef.id,
        title: card.title,
        description: card.description ?? "",
        position: card.position ?? 0,
        labelIds: card.labelIds ?? [],
        memberIds: card.memberIds ?? [],
        dueDate: card.dueDate ?? null,
        dueComplete: card.dueComplete ?? false,
        checklists: card.checklists ?? [],
        coverColor: card.coverColor ?? null,
        commentCount: 0,
        archived: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ]),
  ];

  // Firestore batches are limited to 500 writes; stay well under it.
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach(([ref, data]) => batch.set(ref, data));
    await batch.commit();
  }
}
