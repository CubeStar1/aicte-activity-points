import { CircleCheck } from "lucide-react";
import { Activity } from "@/lib/types/form-filler";
import { totalPoints } from "@/lib/forms/derive";
import { cn } from "@/lib/utils";

const GOAL = 100;

interface PointsSummaryProps {
  activities: Activity[];
}

export function PointsSummary({ activities }: PointsSummaryProps) {
  const total = totalPoints(activities);
  const done = total >= GOAL;

  // Points per semester, in semester order, with unassigned activities last.
  const bySemester = new Map<string, number>();
  for (const act of activities) {
    const points = act.pointsEarned || 0;
    if (points <= 0) continue;
    const key = act.semester || "";
    bySemester.set(key, (bySemester.get(key) || 0) + points);
  }
  const segments = [...bySemester.entries()]
    .map(([semester, points]) => ({ semester, points }))
    .sort(
      (a, b) =>
        (Number(a.semester) || Infinity) - (Number(b.semester) || Infinity)
    );

  const scale = Math.max(total, GOAL);

  return (
    <section
      aria-label="Activity points"
      className="rounded-xl border bg-card p-4 @lg:p-5"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Activity points
          </p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">
              {total}
            </span>
            <span className="text-sm text-muted-foreground">/ {GOAL}</span>
          </p>
        </div>
        <p
          className={cn(
            "flex items-center gap-1.5 pb-1 text-sm",
            done
              ? "font-medium text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          )}
        >
          {done ? (
            <>
              <CircleCheck className="size-4" />
              Requirement met
            </>
          ) : (
            <>
              <span className="font-medium tabular-nums text-foreground">
                {GOAL - total}
              </span>
              to go
            </>
          )}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={GOAL}
        aria-valuenow={Math.min(total, GOAL)}
        className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {segments.map((segment) => (
          <div
            key={segment.semester}
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(segment.points / scale) * 100}%` }}
          />
        ))}
      </div>

      {segments.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {segments.map((segment) => (
            <li key={segment.semester} className="flex items-baseline gap-1.5">
              {segment.semester ? `Sem ${segment.semester}` : "No semester"}
              <span className="font-medium tabular-nums text-foreground">
                {segment.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
