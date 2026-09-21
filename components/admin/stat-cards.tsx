import { Card, CardContent } from "@/components/ui/card";
import type { StudentSummary } from "@/lib/admin/student-summary.mjs";

interface Stat {
  label: string;
  value: string | number;
  hint?: string;
}

export function StatCards({
  students,
  usersWithoutForms,
}: {
  students: StudentSummary[];
  usersWithoutForms: number;
}) {
  const activities = students.reduce((sum, s) => sum + s.activityCount, 0);
  const assets = students.reduce((sum, s) => sum + s.assetCount, 0);
  const points = students.reduce((sum, s) => sum + s.computedPoints, 0);
  const complete = students.filter((s) => s.isComplete).length;

  const stats: Stat[] = [
    {
      label: "Students with forms",
      value: students.length,
      hint: `${usersWithoutForms} signed up without a form`,
    },
    {
      label: "Complete forms",
      value: complete,
      hint: `${students.length - complete} still missing fields`,
    },
    {
      label: "Activities logged",
      value: activities,
      hint: students.length
        ? `${(activities / students.length).toFixed(1)} per student`
        : undefined,
    },
    {
      label: "Assets uploaded",
      value: assets,
      hint: "certificates and photos",
    },
    {
      label: "Points claimed",
      value: points,
      hint: students.length
        ? `${(points / students.length).toFixed(1)} per student`
        : undefined,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
            {stat.hint && (
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
