const COLUMNS = [
  [56, 72, 48],
  [64, 48],
  [48, 64, 56, 40],
];

export default function BoardSkeleton() {
  return (
    <div
      className="flex h-full items-start gap-3 px-4 pb-4 pt-3"
      aria-busy="true"
      aria-label="Loading board"
    >
      {COLUMNS.map((heights, i) => (
        <div
          key={i}
          className="w-72 shrink-0 animate-pulse rounded-2xl bg-white/30 p-3"
        >
          <div className="mb-3 h-4 w-32 rounded bg-white/60" />
          {heights.map((h, j) => (
            <div
              key={j}
              style={{ height: h }}
              className="mb-2 rounded-xl bg-white/60"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
