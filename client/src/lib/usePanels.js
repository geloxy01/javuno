import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PANELS_KEY = "javuno-panels";
const WIDTHS_KEY = "javuno-panel-widths";
const NARROW_QUERY = "(max-width: 767px)";

const DEFAULT_WIDTHS = { notifications: 320, planner: 520 };

// [min, max] width in pixels for the two resizable panels. The board takes the rest.
export const PANEL_LIMITS = { notifications: [260, 520], planner: [380, 1000] };

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: the layout just will not be remembered
  }
}

function initialPanels() {
  const saved = read(PANELS_KEY);
  if (
    saved &&
    typeof saved === "object" &&
    (saved.notifications || saved.planner || saved.board)
  ) {
    return {
      notifications: Boolean(saved.notifications),
      planner: Boolean(saved.planner),
      board: Boolean(saved.board),
    };
  }
  // First visit: Notifications and Board side by side, but only if there is room for both.
  const wide = typeof window !== "undefined" && window.innerWidth >= 1024;
  return { notifications: wide, planner: false, board: true };
}

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => window.matchMedia(NARROW_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const onChange = (e) => setNarrow(e.matches);
    setNarrow(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return narrow;
}

export default function usePanels() {
  const narrow = useNarrow();
  const [panels, setPanels] = useState(initialPanels);
  const [narrowActive, setNarrowActive] = useState("board"); // phones show one panel at a time
  const [widths, setWidths] = useState(() => ({
    ...DEFAULT_WIDTHS,
    ...(read(WIDTHS_KEY) || {}),
  }));

  // Nothing is saved until the person actually changes something.
  const panelsTouched = useRef(false);
  const widthsTouched = useRef(false);

  useEffect(() => {
    if (panelsTouched.current) write(PANELS_KEY, panels);
  }, [panels]);

  useEffect(() => {
    if (widthsTouched.current) write(WIDTHS_KEY, widths);
  }, [widths]);

  const visible = useMemo(
    () =>
      narrow
        ? {
            notifications: narrowActive === "notifications",
            planner: narrowActive === "planner",
            board: narrowActive === "board",
          }
        : panels,
    [narrow, narrowActive, panels],
  );

  const toggle = useCallback(
    (name) => {
      if (narrow) {
        setNarrowActive(name);
        return;
      }
      panelsTouched.current = true;
      setPanels((current) => {
        const next = { ...current, [name]: !current[name] };
        // At least one panel always stays open.
        return next.notifications || next.planner || next.board
          ? next
          : current;
      });
    },
    [narrow],
  );

  const setWidth = useCallback((name, value) => {
    widthsTouched.current = true;
    setWidths((current) =>
      current[name] === value ? current : { ...current, [name]: value },
    );
  }, []);

  return { visible, toggle, widths, setWidth, narrow };
}
