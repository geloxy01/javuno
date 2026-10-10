import { Fragment, useRef } from "react";
import { PANEL_LIMITS } from "../lib/usePanels";

const ORDER = ["notifications", "planner", "board"];

const LABELS = {
  notifications: "Resize the Notifications panel",
  planner: "Resize the Planner panel",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function Divider({ label, value, min, max, onChange }) {
  const dragRef = useRef(null);

  function handlePointerDown(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startValue: value };
    document.body.style.userSelect = "none";
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    onChange(
      clamp(Math.round(drag.startValue + e.clientX - drag.startX), min, max),
    );
  }

  function handlePointerUp(e) {
    dragRef.current = null;
    document.body.style.userSelect = "";
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(clamp(value - 24, min, max));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(clamp(value + 24, min, max));
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className="group relative z-10 w-3 shrink-0 cursor-col-resize touch-none focus:outline-none"
    >
      <span className="absolute inset-y-3 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white/25 transition group-hover:bg-white/70 group-focus-visible:bg-white" />
    </div>
  );
}

export default function PanelWorkspace({
  visible,
  widths,
  narrow,
  onResize,
  panels,
}) {
  const shown = ORDER.filter((key) => visible[key]);

  return (
    <div className="flex min-h-0 flex-1">
      {shown.map((key, index) => {
        const isLast = index === shown.length - 1;
        const fixed = !narrow && !isLast; // the last panel takes the remaining space
        const [min, max] = PANEL_LIMITS[key] || [0, 0];

        let padding = "";
        if (key !== "board") {
          padding = narrow
            ? "p-3 pb-20"
            : `pb-20 pl-3 pt-3 ${isLast ? "pr-3" : ""}`;
        }

        return (
          <Fragment key={key}>
            <section
              aria-label={key}
              className={`flex min-h-0 min-w-0 flex-col ${fixed ? "shrink-0" : "flex-1"} ${padding}`}
              style={
                fixed ? { width: widths[key], maxWidth: "75%" } : undefined
              }
            >
              {panels[key]}
            </section>

            {fixed && (
              <Divider
                label={LABELS[key]}
                value={widths[key]}
                min={min}
                max={max}
                onChange={(value) => onResize(key, value)}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
