import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { commitUpdates } from "./batch";

const col = (uid) => collection(db, "users", uid, "notifications");
const ref = (uid, id) => doc(db, "users", uid, "notifications", id);

// Newest first, at most 30.
export function subscribeToNotifications(uid, onData, onError) {
  return onSnapshot(
    query(col(uid), orderBy("createdAt", "desc"), limit(30)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function markRead(uid, id) {
  return updateDoc(ref(uid, id), { isRead: true });
}

export function markAllRead(uid, items) {
  return commitUpdates(
    items
      .filter((n) => !n.isRead)
      .map((n) => [ref(uid, n.id), { isRead: true }]),
  );
}

export function removeNotification(uid, id) {
  return deleteDoc(ref(uid, id));
}

// ----- Sending -----

const nameOf = (user) =>
  user.displayName || user.email?.split("@")[0] || "Someone";

function send(recipientUid, actor, payload) {
  if (!recipientUid || recipientUid === actor.uid) return Promise.resolve();
  return addDoc(col(recipientUid), {
    type: payload.type,
    boardId: payload.boardId,
    boardTitle: payload.boardTitle || "",
    cardId: payload.cardId ?? null,
    cardTitle: payload.cardTitle || "",
    actorId: actor.uid,
    actorName: nameOf(actor),
    isRead: false,
    createdAt: serverTimestamp(),
  }).catch((err) => {
    console.warn("Could not send notification", err);
  });
}

export function notifyCardAssigned(boardId, boardTitle, actor, card, person) {
  return send(person.uid, actor, {
    type: "card_assigned",
    boardId,
    boardTitle,
    cardId: card.id,
    cardTitle: card.title,
  });
}

export async function notifyAddedToBoard(boardId, actor, person) {
  try {
    const snap = await getDoc(doc(db, "boards", boardId));
    await send(person.uid, actor, {
      type: "board_added",
      boardId,
      boardTitle: snap.data()?.title,
    });
  } catch (err) {
    console.warn("Could not send notification", err);
  }
}

// Tells everyone assigned to the card (except the author) about a new comment.
export async function notifyComment(boardId, actor, cardId) {
  try {
    const [cardSnap, boardSnap] = await Promise.all([
      getDoc(doc(db, "boards", boardId, "cards", cardId)),
      getDoc(doc(db, "boards", boardId)),
    ]);
    const card = cardSnap.data();
    if (!card) return;
    await Promise.all(
      (card.memberIds || []).map((uid) =>
        send(uid, actor, {
          type: "comment_added",
          boardId,
          boardTitle: boardSnap.data()?.title,
          cardId,
          cardTitle: card.title,
        }),
      ),
    );
  } catch (err) {
    console.warn("Could not send notification", err);
  }
}

export function describeNotification(n) {
  const card = n.cardTitle ? `"${n.cardTitle}"` : "a card";
  switch (n.type) {
    case "card_assigned":
      return { actor: n.actorName, text: `added you to ${card}` };
    case "comment_added":
      return { actor: n.actorName, text: `commented on ${card}` };
    case "board_added":
      return {
        actor: n.actorName,
        text: `added you to the board "${n.boardTitle}"`,
      };
    default:
      return { actor: n.actorName, text: "sent you a notification" };
  }
}
