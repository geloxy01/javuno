import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { millis } from "./dates";

const commentsCol = (boardId) => collection(db, "boards", boardId, "comments");
const cardRef = (boardId, cardId) =>
  doc(db, "boards", boardId, "cards", cardId);

// Newest first.
export function subscribeToCardComments(boardId, cardId, onData, onError) {
  return onSnapshot(
    query(commentsCol(boardId), where("cardId", "==", cardId)),
    (snap) => {
      const comments = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
      onData(comments);
    },
    onError,
  );
}

export function addComment(boardId, user, cardId, text) {
  const batch = writeBatch(db);
  batch.set(doc(commentsCol(boardId)), {
    cardId,
    authorId: user.uid,
    authorName: user.displayName || user.email?.split("@")[0] || "User",
    authorPhotoURL: user.photoURL ?? null,
    text,
    createdAt: serverTimestamp(),
    editedAt: null,
  });
  batch.update(cardRef(boardId, cardId), {
    commentCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}

export function editComment(boardId, commentId, text) {
  return updateDoc(doc(db, "boards", boardId, "comments", commentId), {
    text,
    editedAt: serverTimestamp(),
  });
}

export function deleteComment(boardId, cardId, commentId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "boards", boardId, "comments", commentId));
  batch.update(cardRef(boardId, cardId), {
    commentCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}
