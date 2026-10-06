import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isValid, parseISO } from "date-fns";
import {
  CalendarDays,
  FileCheck2,
  GripVertical,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Activity } from "@/lib/types/form-filler";
import { cn } from "@/lib/utils";

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
};

/** "12 Mar – 14 Mar 2024", collapsing whatever the two dates share. */
export const formatDateRange = (startDate?: string, endDate?: string) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start && !end) return null;
  if (!start || !end) return format((start || end)!, "d MMM yyyy");
  if (start.getTime() === end.getTime()) return format(start, "d MMM yyyy");
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(
    end,
    "d MMM yyyy"
  )}`;
};

interface ActivityCardProps {
  id: string;
  index: number;
  activity: Partial<Activity>;
  onEdit: () => void;
  onDelete: () => void;
}

export function ActivityCard({
  id,
  index,
  activity,
  onEdit,
  onDelete,
}: ActivityCardProps) {
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

  const dateRange = formatDateRange(activity.startDate, activity.endDate);
  const photoCount = activity.photos?.length || 0;
  const name = activity.name?.trim();

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-stretch rounded-xl border bg-card transition-shadow",
        isDragging && "z-10 shadow-lg ring-1 ring-ring/40"
      )}
    >
      <button
        type="button"
        aria-label={`Reorder activity ${index + 1}`}
        className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 py-3 pr-2 pl-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-medium",
              activity.semester
                ? "bg-muted text-foreground"
                : "border border-dashed"
            )}
          >
            {activity.semester ? `Sem ${activity.semester}` : "No sem"}
          </span>
        </div>

        <div
          className={cn(
            "mt-1.5 line-clamp-2 font-medium leading-snug",
            !name && "text-muted-foreground"
          )}
        >
          {name || "Untitled activity"}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {dateRange || "No dates"}
          </span>
          {activity.place && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{activity.place}</span>
            </span>
          )}
          {activity.certificateAttached && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="size-3.5" />
              Certificate
            </span>
          )}
          {photoCount > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon className="size-3.5" />
              {photoCount}
            </span>
          )}
        </div>
      </button>

      <div className="flex shrink-0 flex-col items-end justify-between py-2 pr-2">
        <div className="pt-1 pr-1.5 text-right">
          <div className="text-xl font-semibold leading-none tabular-nums">
            {activity.pointsEarned || 0}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            pts
          </div>
        </div>
        <div className="flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground"
            onClick={onEdit}
            aria-label={`Edit activity ${index + 1}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete activity ${index + 1}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
