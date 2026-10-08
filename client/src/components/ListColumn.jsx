import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import AddCardComposer from "./AddCardComposer";
import CardItem from "./CardItem";
import InlineEdit from "./InlineEdit";
import ListMenu from "./ListMenu";
import SortableCard from "./SortableCard";

const ListColumn = forwardRef(function ListColumn(
  {
    list,
    cards,
    onRename,
    onAddCard,
    onCopy,
    onArchive,
    style,
    handleRef,
    handleProps,
    isPlaceholder = false,
    isOverlay = false,
  },
  ref,
) {
  const [composing, setComposing] = useState(false);
  const scrollRef = useRef(null);
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  // Keep the newest card in view while adding cards.
  useEffect(() => {
    if (composing && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [composing, cards.length]);

  let surface;
  if (isPlaceholder) {
    surface = "bg-white/25 shadow-none ring-2 ring-inset ring-white/50";
  } else if (isOverlay) {
    surface =
      "drag-pickup-list pointer-events-none bg-slate-100 shadow-2xl dark:bg-slate-800";
  } else {
    surface = "bg-slate-100/95 shadow-soft dark:bg-slate-800/95";
  }
  const hide = isPlaceholder ? "invisible" : "";

  return (
    <section
      ref={ref}
      style={style}
      aria-label={list.title}
      className={`flex max-h-full w-72 shrink-0 flex-col rounded-2xl ${surface}`}
    >
      <header
        ref={handleRef}
        {...handleProps}
        className={`flex touch-manipulation items-center gap-1 px-2.5 pb-1 pt-2.5 ${
          isOverlay ? "" : "cursor-grab active:cursor-grabbing"
        } ${hide}`}
      >
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={list.title}
            onSave={(title) => onRename?.(list, title)}
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
        {/* data-no-dnd: pressing the menu never starts a list drag */}
        <div data-no-dnd className="shrink-0">
          <ListMenu
            onAddCard={() => setComposing(true)}
            onCopy={() => onCopy?.(list)}
            onArchive={() => onArchive?.(list)}
          />
        </div>
      </header>

      <div
        ref={scrollRef}
        className={`min-h-[2.5rem] min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-1 pt-1 ${hide}`}
      >
        {isOverlay ? (
          cards.map((card) => <CardItem key={card.id} card={card} />)
        ) : (
          <SortableContext
            items={cardIds}
            strategy={verticalListSortingStrategy}
          >
            {cards.map((card) => (
              <SortableCard key={card.id} card={card} />
            ))}
          </SortableContext>
        )}

        {cards.length === 0 && !composing && (
          <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
            No cards yet
          </p>
        )}
      </div>

      <footer className={`p-2 ${hide}`}>
        <AddCardComposer
          open={composing}
          onOpen={() => setComposing(true)}
          onClose={() => setComposing(false)}
          onAdd={(title) => onAddCard?.(list, title)}
        />
      </footer>
    </section>
  );
});

export default ListColumn;
