import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout } = useAuth();
  const name = user?.displayName || user?.email || "User";
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Javuno logo"
            className="h-9 w-9 rounded-xl shadow-soft"
          />
          <span className="text-xl font-bold tracking-tight text-javuno-dark dark:text-white">
            Javuno
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-300 dark:hover:bg-slate-800" />
          <div className="flex items-center gap-2">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-javuno text-sm font-semibold text-white">
                {initial}
              </div>
            )}
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 sm:block dark:text-slate-200">
              {name}
            </span>
          </div>
          <button onClick={logout} className="btn-secondary !px-3 !py-2">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
