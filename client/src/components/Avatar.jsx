export default function Avatar({
  name = "",
  photoURL = null,
  className = "h-8 w-8",
  textClass = "text-xs",
  ring = "",
}) {
  const base = `${className} shrink-0 rounded-full ${ring}`;

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        title={name}
        referrerPolicy="no-referrer"
        className={`${base} object-cover`}
      />
    );
  }

  return (
    <div
      title={name}
      className={`${base} flex items-center justify-center bg-javuno font-semibold text-white ${textClass}`}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}
