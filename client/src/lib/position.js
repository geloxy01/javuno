export const POSITION_STEP = 1000;
export const MIN_GAP = 0.001;

// Position for a new item placed after everything in `items`.
export function nextPosition(items) {
  if (!items || items.length === 0) return POSITION_STEP;
  return Math.max(...items.map((item) => item.position ?? 0)) + POSITION_STEP;
}

// Position for an item dropped between `prev` and `next` (either can be null).
export function positionBetween(prev, next) {
  if (prev == null && next == null) return POSITION_STEP;
  if (prev == null) return next - POSITION_STEP; // dropped at the start
  if (next == null) return prev + POSITION_STEP; // dropped at the end
  return (prev + next) / 2; // dropped between two items
}

// True when the neighbors are too close together to split safely.
export function gapTooSmall(prev, next) {
  return prev != null && next != null && next - prev < MIN_GAP * 2;
}

// Renumber an ordered array evenly: 1000, 2000, 3000...
export function rebalancePositions(items) {
  return items.map((item, index) => ({
    id: item.id,
    position: (index + 1) * POSITION_STEP,
  }));
}

// `ordered` is the final order of one list (or of the lists) and `index` is the moved item.
// Returns the writes to make: one item normally, every item when a rebalance is needed.
export function planMove(ordered, index) {
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  const prevPos = prev ? (prev.position ?? 0) : null;
  const nextPos = next ? (next.position ?? 0) : null;

  if (gapTooSmall(prevPos, nextPos)) {
    return { rebalanced: true, updates: rebalancePositions(ordered) };
  }
  return {
    rebalanced: false,
    updates: [
      { id: ordered[index].id, position: positionBetween(prevPos, nextPos) },
    ],
  };
}

export function sortByPosition(items) {
  return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}
