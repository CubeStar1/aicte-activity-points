import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Activity } from "@/lib/types/form-filler";
import { cn } from "@/lib/utils";
import { formatDateRange } from "./activity-card";

interface SortableTableRowProps {
  id: string;
  index: number;
  activity: Partial<Activity>;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableTableRow({
  id,
  index,
  activity,
  onEdit,
  onDelete,
}: SortableTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const name = activity.name?.trim();

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "relative z-10 bg-muted shadow-md")}
    >
      <TableCell className="pl-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Reorder activity ${index + 1}`}
            className="flex size-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </TableCell>
      <TableCell className="min-w-40 whitespace-normal">
        <button
          type="button"
          onClick={onEdit}
          title={name}
          className={cn(
            "line-clamp-2 text-left font-medium leading-snug hover:underline",
            !name && "text-muted-foreground"
          )}
        >
          {name || "Untitled activity"}
        </button>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDateRange(activity.startDate, activity.endDate) || "–"}
      </TableCell>
      <TableCell className="text-center tabular-nums">
        {activity.semester || "–"}
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {activity.pointsEarned || 0}
      </TableCell>
      <TableCell className="pr-2">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={onEdit}
            aria-label={`Edit activity ${index + 1}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete activity ${index + 1}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
