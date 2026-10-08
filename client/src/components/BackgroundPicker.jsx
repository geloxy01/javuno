import { useState } from "react";
import HeaderPopover, { HEADER_BUTTON } from "./HeaderPopover";
import { PaletteIcon } from "./uiIcons";
import { useToast } from "../context/ToastContext";
import { DEFAULT_BACKGROUND } from "../lib/boards";

const GRADIENTS = [
  { name: "Javuno blue", value: DEFAULT_BACKGROUND.value },
  {
    name: "Ocean",
    value: "linear-gradient(135deg, #38BDF8 0%, #2563EB 55%, #1E3A8A 100%)",
  },
  {
    name: "Sunset",
    value: "linear-gradient(135deg, #FB923C 0%, #DB2777 55%, #7E22CE 100%)",
  },
  {
    name: "Forest",
    value: "linear-gradient(135deg, #34D399 0%, #059669 55%, #064E3B 100%)",
  },
  {
    name: "Grape",
    value: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 55%, #4C1D95 100%)",
  },
  {
    name: "Aurora",
    value: "linear-gradient(135deg, #22D3EE 0%, #6366F1 55%, #A855F7 100%)",
  },
  {
    name: "Rose",
    value: "linear-gradient(135deg, #FDA4AF 0%, #E11D48 55%, #881337 100%)",
  },
  {
    name: "Midnight",
    value: "linear-gradient(135deg, #475569 0%, #1E293B 55%, #020617 100%)",
  },
];

const COLORS = [
  "#3B3FF0",
  "#2A2A9E",
  "#0284C7",
  "#059669",
  "#65A30D",
  "#D97706",
  "#EA580C",
  "#DC2626",
  "#DB2777",
  "#9333EA",
  "#475569",
  "#0F172A",
];

const swatch = (selected) =>
  `h-12 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-javuno focus:ring-offset-2 ${
    selected ? "ring-2 ring-javuno ring-offset-2" : "hover:opacity-85"
  }`;

function Panel({ background, onChange }) {
  const { showError } = useToast();
  const [imageUrl, setImageUrl] = useState(
    background?.type === "image" ? background.value : "",
  );
  const [checking, setChecking] = useState(false);

  function applyImage(e) {
    e.preventDefault();
    let url;
    try {
      url = new URL(imageUrl.trim());
    } catch {
      showError("Enter a valid image URL, starting with https://");
      return;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      showError("The image URL must start with https:// or http://");
      return;
    }

    // Parentheses and quotes would break the CSS url(...) value.
    const href = url.href
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      .replace(/'/g, "%27");

    setChecking(true);
    const img = new Image();
    img.onload = () => {
      setChecking(false);
      onChange({ type: "image", value: href });
    };
    img.onerror = () => {
      setChecking(false);
      showError(
        "That image couldn't be loaded. Check the URL, or try another site.",
      );
    };
    img.src = href;
  }

  return (
    <div className="space-y-4">
      <section>
        <h5 className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Gradients
        </h5>
        <div className="grid grid-cols-4 gap-2">
          {GRADIENTS.map((g) => (
            <button
              key={g.name}
              type="button"
              onClick={() => onChange({ type: "gradient", value: g.value })}
              aria-label={g.name}
              title={g.name}
              aria-pressed={background?.value === g.value}
              style={{ background: g.value }}
              className={swatch(background?.value === g.value)}
            />
          ))}
        </div>
      </section>

      <section>
        <h5 className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Colors
        </h5>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ type: "color", value: c })}
              aria-label={`Color ${c}`}
              aria-pressed={background?.value === c}
              style={{ background: c }}
              className={`${swatch(background?.value === c)} !h-9`}
            />
          ))}
        </div>
      </section>

      <section>
        <h5 className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Image
        </h5>
        <form onSubmit={applyImage} className="space-y-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            aria-label="Image URL"
            className="input !py-2"
          />
          <button
            type="submit"
            disabled={!imageUrl.trim() || checking}
            className="btn-primary !px-3 !py-1.5"
          >
            {checking ? "Checking…" : "Use this image"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function BackgroundPopover({ background, onChange }) {
  return (
    <HeaderPopover
      label="Change background"
      title="Board background"
      buttonClassName={HEADER_BUTTON}
      trigger={<PaletteIcon />}
    >
      <Panel background={background} onChange={onChange} />
    </HeaderPopover>
  );
}
