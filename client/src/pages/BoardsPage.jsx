import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { createBoard, subscribeToMyBoards } from "../lib/boards";

function backgroundStyle(background) {
  if (!background) return {};
  if (background.type === "image") {
    return {
      backgroundImage: `url(${background.value})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  // 'gradient' and 'color' are both valid CSS "background" values
  return { background: background.value };
}

export default function BoardsPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToMyBoards(
      user.uid,
      (list) => {
        setBoards(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(
          "Could not load your boards. Check your Firestore rules and .env settings.",
        );
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user.uid]);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      await createBoard(user, trimmed);
      setTitle("");
      setCreating(false);
    } catch (err) {
      console.error(err);
      setError("Could not create the board. Check your Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

  function cancelCreate() {
    setCreating(false);
    setTitle("");
  }

  return (
    <div className="min-h-full">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Your boards</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Boards you own or have been invited to.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Create new board tile */}
            {creating ? (
              <form
                onSubmit={handleCreate}
                className="flex h-28 flex-col justify-between rounded-2xl border border-javuno/30 bg-javuno-light p-3 shadow-soft dark:bg-slate-800"
              >
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && cancelCreate()}
                  placeholder="Board title"
                  maxLength={80}
                  className="input !py-2"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || !title.trim()}
                    className="btn-primary !px-3 !py-1.5"
                  >
                    {saving ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelCreate}
                    className="btn-secondary !px-3 !py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex h-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-javuno/40 bg-javuno-light/60 text-javuno-dark transition hover:border-javuno hover:bg-javuno-light focus:outline-none focus:ring-2 focus:ring-javuno dark:bg-slate-800/60 dark:text-slate-200"
              >
                <span className="text-3xl leading-none text-javuno">+</span>
                <span className="text-sm font-semibold">Create new board</span>
              </button>
            )}

            {/* Existing boards */}
            {boards.map((board) => (
              <Link
                key={board.id}
                to={`/b/${board.id}`}
                style={backgroundStyle(board.background)}
                className="group relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-javuno focus:ring-offset-2"
              >
                <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
                <h2 className="relative line-clamp-2 text-base font-bold text-white drop-shadow">
                  {board.title}
                </h2>
                <span className="relative self-start rounded-full bg-white/25 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
                  {board.ownerId === user.uid ? "Owner" : "Member"}
                </span>
              </Link>
            ))}
          </div>
        )}

        {!loading && boards.length === 0 && !creating && (
          <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
            You don't have any boards yet. Create your first one to get started.
          </p>
        )}
      </main>
    </div>
  );
}
