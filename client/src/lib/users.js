import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const email = user.email ?? "";
  await setDoc(ref, {
    uid: user.uid,
    displayName: user.displayName || email.split("@")[0] || "User",
    email,
    emailLower: email.toLowerCase(),
    photoURL: user.photoURL ?? null,
    theme: "system",
    createdAt: serverTimestamp(),
  });
}
