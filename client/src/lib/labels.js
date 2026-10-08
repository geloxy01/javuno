import {
  addDoc,
  arrayRemove,
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
import { commitUpdates } from "./batch";

export const LABEL_COLORS = [
  "#059669", // green
  "#D97706", // amber
  "#EA580C", // orange
  "#DC2626", // red
  "#9333EA", // purple
  "#3B3FF0", // indigo
  "#0284C7", // sky
  "#65A30D", // lime
  "#DB2777", // pink
  "#475569", // slate
];

export const COVER_COLORS = LABEL_COLORS;

const labelsCol = (boardId) => collection(db, "boards", boardId, "labels");

// Oldest first. A label just created locally has no server time yet, so it goes last.
export function subscribeToLabels(boardId, onData, onError) {
  return onSnapshot(
    labelsCol(boardId),
    (snap) => {
      const labels = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const at = a.createdAt
            ? a.createdAt.seconds
            : Number.MAX_SAFE_INTEGER;
          const bt = b.createdAt
            ? b.createdAt.seconds
            : Number.MAX_SAFE_INTEGER;
          return at - bt;
        });
      onData(labels);
    },
    onError,
  );
}

export function createLabel(boardId, name, color) {
  return addDoc(labelsCol(boardId), {
    name,
    color,
    createdAt: serverTimestamp(),
  });
}

export function updateLabel(boardId, labelId, { name, color }) {
  return updateDoc(doc(db, "boards", boardId, "labels", labelId), {
    name,
    color,
  });
}

export async function deleteLabel(boardId, labelId) {
  const cardsSnap = await getDocs(
    query(
      collection(db, "boards", boardId, "cards"),
      where("labelIds", "array-contains", labelId),
    ),
  );
  await commitUpdates(
    cardsSnap.docs.map((d) => [d.ref, { labelIds: arrayRemove(labelId) }]),
  );
  await deleteDoc(doc(db, "boards", boardId, "labels", labelId));
}
