import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { commitUpdates } from "./batch";

// Prefix search on the lowercase email. Needs at least 3 characters.
export async function searchUsersByEmail(text) {
  const term = text.trim().toLowerCase();
  if (term.length < 3) return [];
  const snap = await getDocs(
    query(
      collection(db, "users"),
      where("emailLower", ">=", term),
      where("emailLower", "<=", `${term}\uf8ff`),
      limit(6),
    ),
  );
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

// Owner only (enforced by the rules).
export function addMember(boardId, person) {
  return updateDoc(doc(db, "boards", boardId), {
    memberIds: arrayUnion(person.uid),
    [`members.${person.uid}`]: {
      role: "member",
      displayName: person.displayName || person.email?.split("@")[0] || "User",
      email: person.email ?? "",
      photoURL: person.photoURL ?? null,
    },
    updatedAt: serverTimestamp(),
  });
}

// Used by the owner to remove someone, and by a member to leave.
// Cards are cleaned first, because the rules only allow assigning current members.
export async function removeMember(boardId, uid) {
  const cardsSnap = await getDocs(
    query(
      collection(db, "boards", boardId, "cards"),
      where("memberIds", "array-contains", uid),
    ),
  );
  await commitUpdates(
    cardsSnap.docs.map((d) => [d.ref, { memberIds: arrayRemove(uid) }]),
  );
  await updateDoc(doc(db, "boards", boardId), {
    memberIds: arrayRemove(uid),
    [`members.${uid}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
}
