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
import { commitUpdates } from "./batch";

const listsCol = (boardId) => collection(db, "boards", boardId, "lists");
const listRef = (boardId, listId) =>
  doc(db, "boards", boardId, "lists", listId);

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
  return updateDoc(listRef(boardId, listId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

export function archiveList(boardId, listId) {
  return updateDoc(listRef(boardId, listId), {
    archived: true,
    updatedAt: serverTimestamp(),
  });
}

// Drag and drop: only the moved list is written.
export function moveList(boardId, listId, position) {
  return updateDoc(listRef(boardId, listId), {
    position,
    updatedAt: serverTimestamp(),
  });
}

// Used when gaps get too small. entries: [{ id, position }] for every list, in order.
export function rebalanceLists(boardId, entries) {
  return commitUpdates(
    entries.map(({ id, position }) => [
      listRef(boardId, id),
      { position, updatedAt: serverTimestamp() },
    ]),
  );
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
