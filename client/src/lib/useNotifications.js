import { useEffect, useRef, useState } from "react";
import { useToast } from "../context/ToastContext";
import { millis } from "./dates";
import {
  describeNotification,
  subscribeToNotifications,
} from "./notifications";

export default function useNotifications(uid) {
  const { showSuccess } = useToast();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(false);
  const seenRef = useRef(null); // ids already shown; null until the first load

  useEffect(() => {
    seenRef.current = null;
    setItems([]);
    setError(false);

    return subscribeToNotifications(
      uid,
      (list) => {
        // After the first load, announce brand-new unread notifications.
        if (seenRef.current) {
          list
            .filter(
              (n) =>
                !n.isRead &&
                !seenRef.current.has(n.id) &&
                millis(n.createdAt) > Date.now() - 60000,
            )
            .forEach((n) => {
              const d = describeNotification(n);
              showSuccess(`${d.actor} ${d.text}`);
            });
        }
        seenRef.current = new Set(list.map((n) => n.id));
        setItems(list);
        setError(false);
      },
      (err) => {
        console.warn("Could not load notifications", err);
        setError(true);
      },
    );
  }, [uid, showSuccess]);

  const unread = items.filter((n) => !n.isRead).length;
  return { items, error, unread };
}
