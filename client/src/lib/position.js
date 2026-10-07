export const POSITION_GAP = 65536;

// Position for a new item placed after everything in `items`.
export function nextPosition(items) {
  if (!items || items.length === 0) return POSITION_GAP;
  return Math.max(...items.map((item) => item.position ?? 0)) + POSITION_GAP;
}
