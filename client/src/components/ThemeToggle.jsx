import { useTheme } from "../context/ThemeContext";
import { MoonIcon, SunIcon } from "./uiIcons";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={className}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
