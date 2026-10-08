import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CardItem from "./CardItem";

export default function SortableCard({ card, labelsById, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card" },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <CardItem
      ref={setNodeRef}
      card={card}
      labelsById={labelsById}
      style={style}
      isPlaceholder={isDragging}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick?.();
      }}
      {...attributes}
      {...listeners}
    />
  );
}
