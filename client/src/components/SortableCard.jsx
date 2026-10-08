import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CardItem from "./CardItem";

export default function SortableCard({ card, onClick }) {
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
      style={style}
      isPlaceholder={isDragging}
      onClick={onClick}
      {...attributes}
      {...listeners}
    />
  );
}
