import { useEffect, useRef, useState } from "react";
import AddCardComposer from "./AddCardComposer";
import CardItem from "./CardItem";
import InlineEdit from "./InlineEdit";
import ListMenu from "./ListMenu";

export default function ListColumn({
  list,
  cards,
  onRename,
  onAddCard,
  onCopy,
  onArchive,
}) {
  const [composing, setComposing] = useState(false);
  const scrollRef = useRef(null);

  // Keep the newest card in view while adding cards.
  useEffect(() => {
    if (composing && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [composing, cards.length]);

  return (
    <section
      aria-label={list.title}
      className="flex max-h-full w-72 shrink-0 flex-col rounded-2xl bg-slate-100/95 shadow-soft dark:bg-slate-800/95"
    >
      <header className="flex items-center gap-1 px-2.5 pb-1 pt-2.5">
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={list.title}
            onSave={(title) => onRename(list, title)}
            maxLength={80}
            label="List title"
            className="block w-full truncate rounded-lg px-2 py-1 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-javuno dark:text-slate-100 dark:hover:bg-slate-700"
            inputClassName="w-full rounded-lg border border-javuno bg-white px-2 py-1 text-sm font-semibold text-slate-800 outline-none ring-2 ring-javuno/30 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <span
          className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          title={`${cards.length} ${cards.length === 1 ? "card" : "cards"}`}
        >
          {cards.length}
        </span>
        <ListMenu
          onAddCard={() => setComposing(true)}
          onCopy={() => onCopy(list)}
          onArchive={() => onArchive(list)}
        />
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-1 pt-1"
      >
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}

        {cards.length === 0 && !composing && (
          <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
            No cards yet
          </p>
        )}
      </div>

      <footer className="p-2">
        <AddCardComposer
          open={composing}
          onOpen={() => setComposing(true)}
          onClose={() => setComposing(false)}
          onAdd={(title) => onAddCard(list, title)}
        />
      </footer>
    </section>
  );
}
