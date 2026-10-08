import { getDueInfo } from "./dates";

export const EMPTY_FILTERS = { labels: [], members: [], due: "any" };

export const DUE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "overdue", label: "Overdue" },
  { value: "soon", label: "Due in the next 24 hours" },
  { value: "complete", label: "Marked complete" },
  { value: "has", label: "Has a due date" },
  { value: "none", label: "No due date" },
];

export function countActiveFilters(filters) {
  return (
    filters.labels.length +
    filters.members.length +
    (filters.due !== "any" ? 1 : 0)
  );
}

export function hasActiveFilter(query, filters) {
  return query.trim() !== "" || countActiveFilters(filters) > 0;
}

function searchText(card, labelsById, membersById) {
  const parts = [card.title, card.description];
  (card.checklists || []).forEach((checklist) => {
    parts.push(checklist.title);
    (checklist.items || []).forEach((item) => parts.push(item.text));
  });
  (card.labelIds || []).forEach((id) => parts.push(labelsById[id]?.name));
  (card.memberIds || []).forEach((id) => {
    parts.push(membersById[id]?.displayName, membersById[id]?.email);
  });
  return parts.filter(Boolean).join(" ").toLowerCase();
}

// True when the card passes the search text AND every active filter.
export function cardMatches(card, query, filters, labelsById, membersById) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const text = searchText(card, labelsById, membersById);
    if (!words.every((word) => text.includes(word))) return false;
  }

  if (filters.labels.length > 0) {
    if (!(card.labelIds || []).some((id) => filters.labels.includes(id)))
      return false;
  }

  if (filters.members.length > 0) {
    const assigned = card.memberIds || [];
    const ok = filters.members.some((id) =>
      id === "none" ? assigned.length === 0 : assigned.includes(id),
    );
    if (!ok) return false;
  }

  if (filters.due !== "any") {
    const due = getDueInfo(card);
    switch (filters.due) {
      case "overdue":
        return due?.tone === "overdue";
      case "soon":
        return due?.tone === "soon";
      case "complete":
        return due?.tone === "done";
      case "has":
        return Boolean(due);
      case "none":
        return !due;
      default:
        return true;
    }
  }

  return true;
}
