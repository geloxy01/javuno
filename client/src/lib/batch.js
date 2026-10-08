import { writeBatch } from "firebase/firestore";
import { db } from "./firebase";

const CHUNK_SIZE = 400;

// updates: [[docRef, dataObject], ...]
export async function commitUpdates(updates) {
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    updates
      .slice(i, i + CHUNK_SIZE)
      .forEach(([ref, data]) => batch.update(ref, data));
    await batch.commit();
  }
}
