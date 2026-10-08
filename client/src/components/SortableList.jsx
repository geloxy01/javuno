import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ListColumn from "./ListColumn";

export default function SortableList({ list, ...props }) {
  const {
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: { type: "list" },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <ListColumn
      ref={setNodeRef}
      style={style}
      list={list}
      isPlaceholder={isDragging}
      handleRef={setActivatorNodeRef}
      handleProps={listeners}
      {...props}
    />
  );
}
