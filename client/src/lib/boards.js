import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export const DEFAULT_BACKGROUND = {
  type: "gradient",
  value: "linear-gradient(135deg, #5B8CFF 0%, #3B3FF0 55%, #2A2A9E 100%)",
};

// Turns a board.background object into an inline style.
export function backgroundStyle(background) {
  if (!background) return {};
  if (background.type === "image") {
    return {
      backgroundImage: `url(${background.value})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  // 'gradient' and 'color' are both valid CSS "background" values
  return { background: background.value };
}

// Real-time list of boards where I am a member. Returns the unsubscribe function.
export function subscribeToMyBoards(uid, onData, onError) {
  const q = query(
    collection(db, "boards"),
    where("memberIds", "array-contains", uid),
  );

  return onSnapshot(
    q,
    (snap) => {
      const boards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Newest first. A board just created locally has createdAt = null until the server confirms.
      boards.sort((a, b) => {
        const aTime = a.createdAt
          ? a.createdAt.seconds
          : Number.MAX_SAFE_INTEGER;
        const bTime = b.createdAt
          ? b.createdAt.seconds
          : Number.MAX_SAFE_INTEGER;
        return bTime - aTime;
      });
      onData(boards);
    },
    onError,
  );
}

// Real-time single board. onData receives the board, or null if it does not exist.
export function subscribeToBoard(boardId, onData, onError) {
  return onSnapshot(
    doc(db, "boards", boardId),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError,
  );
}

export async function createBoard(user, title) {
  const ref = await addDoc(collection(db, "boards"), {
    title,
    ownerId: user.uid,
    memberIds: [user.uid],
    members: {
      [user.uid]: {
        role: "owner",
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email ?? "",
        photoURL: user.photoURL ?? null,
      },
    },
    starredBy: [],
    background: DEFAULT_BACKGROUND,
    closed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function renameBoard(boardId, title) {
  return updateDoc(doc(db, "boards", boardId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

// Star or unstar a board for one user. Works on older boards that have no starredBy field yet.
export function toggleStar(boardId, uid, starred) {
  return updateDoc(doc(db, "boards", boardId), {
    starredBy: starred ? arrayUnion(uid) : arrayRemove(uid),
  });
}
