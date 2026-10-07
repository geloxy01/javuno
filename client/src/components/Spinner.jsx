export default function Spinner({ className = "h-8 w-8" }) {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-javuno/20 border-t-javuno ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
