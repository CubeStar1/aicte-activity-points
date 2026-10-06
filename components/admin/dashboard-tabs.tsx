"use client";

import Link from "next/link";
import {
  Activity as ActivityIcon,
  Award,
  Bot,
  CalendarClock,
  CircleCheck,
  Clock,
  FileText,
  FileWarning,
  Image as ImageIcon,
  MailCheck,
  Target,
  TriangleAlert,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarList,
  ChartCard,
  ColumnChart,
  EmptyState,
  NEUTRAL_COLOR,
  SERIES_COLORS,
  StatGrid,
  StatTile,
  TrendChart,
  seriesTable,
  type Series,
  type TableView,
} from "@/components/admin/charts";
import { SignupsCard } from "@/components/admin/signups-card";
import {
  POINTS_TARGET,
  type CountDatum,
  type DashboardAnalytics,
  type StudentRef,
} from "@/lib/admin/analytics";
import {
  formatDate,
  formatDayKey,
  formatMonthKey,
  formatNumber,
  formatPercent,
} from "@/lib/admin/format";
import type { StudentSummary } from "@/lib/admin/student-summary.mjs";

const one = (key: string, label: string): Series[] => [
  { key, label, color: SERIES_COLORS[0] },
];

function countTable(data: CountDatum[], labelColumn: string, valueColumn: string): TableView {
  return {
    columns: [labelColumn, valueColumn],
    rows: data.map((datum) => [datum.label, formatNumber(datum.value)]),
  };
}

function studentLabel(student: { name: string; usn: string }) {
  return [student.name || "Unnamed student", student.usn].filter(Boolean).join(" · ");
}

function StudentRows({
  students,
  value,
  empty,
}: {
  students: StudentRef[];
  value: (student: StudentRef) => React.ReactNode;
  empty: string;
}) {
  if (students.length === 0) return <EmptyState>{empty}</EmptyState>;

  return (
    <ul className="divide-y">
      {students.map((student) => (
        <li key={student.userId}>
          <Link
            href={`/dashboard/${student.userId}`}
            className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-foreground/70"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {student.name || "Unnamed student"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {student.usn || "no USN"}
                {student.department ? ` · ${student.department}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-right text-xs text-muted-foreground">
              {value(student)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OverviewTab({ analytics }: { analytics: DashboardAnalytics }) {
  const { totals, growth } = analytics;
  const growthSeries: Series[] = [
    { key: "users", label: "Accounts", color: SERIES_COLORS[0] },
    { key: "forms", label: "Forms started", color: SERIES_COLORS[1] },
  ];
  const growthTooltip = (key: string) =>
    growth.bucket === "week"
      ? `Week of ${formatDayKey(key, true)}`
      : formatDayKey(key, true);

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatTile
          label="Registered users"
          value={formatNumber(totals.registeredUsers)}
          hint={`${totals.newUsersLast7Days} new in the last 7 days`}
          icon={Users}
        />
        <StatTile
          label="Forms started"
          value={formatNumber(totals.studentsWithForms)}
          hint={`${formatPercent(totals.studentsWithForms, totals.registeredUsers)} of registered users`}
          icon={FileText}
        />
        <StatTile
          label={`Reached ${POINTS_TARGET} points`}
          value={formatNumber(totals.reachedTarget)}
          hint={`${formatPercent(totals.reachedTarget, totals.studentsWithForms)} of students with a form`}
          icon={Target}
        />
        <StatTile
          label="Complete forms"
          value={formatNumber(totals.completeForms)}
          hint={`${totals.studentsWithForms - totals.completeForms} still missing fields`}
          icon={CircleCheck}
        />
        <StatTile
          label="Activities logged"
          value={formatNumber(totals.activities)}
          hint={`${formatNumber(totals.avgActivities)} per student`}
          icon={ActivityIcon}
        />
        <StatTile
          label="Points claimed"
          value={formatNumber(totals.points)}
          hint={`Average ${formatNumber(totals.avgPoints)} · median ${formatNumber(totals.medianPoints)}`}
          icon={Award}
        />
        <StatTile
          label="Hours logged"
          value={formatNumber(totals.hours)}
          hint={`${formatNumber(totals.avgHoursPerActivity)} per activity`}
          icon={Clock}
        />
        <StatTile
          label="Assets uploaded"
          value={formatNumber(totals.assets)}
          hint="Certificates and photos"
          icon={ImageIcon}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Growth"
          description={`Running total of accounts and forms, by ${growth.bucket}.`}
          table={seriesTable(
            growth.points,
            "date",
            growth.bucket === "week" ? "Week of" : "Date",
            growthSeries,
            (key) => formatDayKey(key, true)
          )}
        >
          <TrendChart
            data={growth.points}
            xKey="date"
            series={growthSeries}
            formatX={formatDayKey}
            formatTooltipX={growthTooltip}
            stepped
          />
        </ChartCard>

        <ChartCard
          title="Funnel"
          description="How far registered users have got."
        >
          <BarList
            items={analytics.funnel.map((step) => ({
              label: step.label,
              value: step.value,
              display: `${formatNumber(step.value)} · ${formatPercent(step.value, totals.registeredUsers)}`,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Points per student"
          description={`Students by points claimed. The target is ${POINTS_TARGET}.`}
          table={countTable(analytics.pointsDistribution, "Points", "Students")}
        >
          <ColumnChart
            data={analytics.pointsDistribution}
            xKey="label"
            series={one("value", "Students")}
            formatTooltipX={(label) => `${label} points`}
          />
        </ChartCard>

        <ChartCard title="Most points" description="Top ten students by points claimed.">
          <StudentRows
            students={analytics.topStudents}
            empty="No students yet."
            value={(student) => (
              <span className="text-sm font-medium tabular-nums text-foreground">
                {student.points}
              </span>
            )}
          />
        </ChartCard>

        <ChartCard title="Recently updated" description="Forms edited most recently.">
          <StudentRows
            students={analytics.recentlyUpdated}
            empty="No forms yet."
            value={(student) => formatDate(student.updatedAt)}
          />
        </ChartCard>
      </div>
    </div>
  );
}

export function ActivitiesTab({ analytics }: { analytics: DashboardAnalytics }) {
  const { totals, evidence } = analytics;
  const { semesters, activityMonths: months, categories } = analytics;
  const categoryMax = Math.max(...categories.map((c) => c.activities), 1);

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatTile
          label="Activities logged"
          value={formatNumber(totals.activities)}
          hint={`${formatNumber(totals.avgActivities)} per student`}
          icon={ActivityIcon}
        />
        <StatTile
          label="Points per activity"
          value={formatNumber(totals.avgPointsPerActivity)}
          hint={`${formatNumber(totals.points)} points in total`}
          icon={Award}
        />
        <StatTile
          label="Hours per activity"
          value={formatNumber(totals.avgHoursPerActivity)}
          hint={`${formatNumber(totals.hours)} hours in total`}
          icon={Clock}
        />
        <StatTile
          label="With a certificate"
          value={formatPercent(evidence.withCertificate, evidence.activities)}
          hint={`${evidence.withCertificate} of ${evidence.activities} activities`}
          icon={ImageIcon}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="When activities happened"
          description="Activities by the month they started."
          table={seriesTable(months, "month", "Month", [
            ...one("activities", "Activities"),
            { key: "points", label: "Points", color: SERIES_COLORS[1] },
          ], formatMonthKey)}
        >
          <ColumnChart
            data={months}
            xKey="month"
            series={one("activities", "Activities")}
            formatX={formatMonthKey}
          />
        </ChartCard>

        <ChartCard
          title="Activities per student"
          description="How many activities each form lists."
          table={countTable(analytics.activityCountDistribution, "Activities", "Students")}
        >
          <ColumnChart
            data={analytics.activityCountDistribution}
            xKey="label"
            series={one("value", "Students")}
            formatTooltipX={(label) => `${label} activities`}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Activities by semester"
          description="Which semesters students did their activities in."
          table={seriesTable(semesters, "label", "Semester", [
            ...one("activities", "Activities"),
            { key: "points", label: "Points", color: SERIES_COLORS[1] },
            { key: "hours", label: "Hours", color: SERIES_COLORS[2] },
          ])}
        >
          <ColumnChart
            data={semesters}
            xKey="label"
            series={one("activities", "Activities")}
            formatTooltipX={(label) =>
              /^\d+$/.test(label) ? `Semester ${label}` : label
            }
          />
        </ChartCard>

        <ChartCard
          title="Points by semester"
          description="Points claimed for activities in each semester."
        >
          <ColumnChart
            data={semesters}
            xKey="label"
            series={one("points", "Points")}
            formatTooltipX={(label) =>
              /^\d+$/.test(label) ? `Semester ${label}` : label
            }
          />
        </ChartCard>
      </div>

      <ChartCard
        title="AICTE categories"
        description="Activities mapped to each AICTE category."
      >
        <div className="grid gap-x-8 gap-y-3 lg:grid-cols-2">
          {[0, 1].map((column) => {
            const half = Math.ceil(categories.length / 2);
            const items = categories.slice(
              column * half,
              column * half + half
            );
            if (column === 1 && items.length === 0) return null;

            return (
              <BarList
                key={column}
                empty="No activities yet."
                // Both columns share one scale.
                max={categoryMax}
                items={items.map((category) => ({
                  label: category.label,
                  value: category.activities,
                  hint: `${category.students} ${category.students === 1 ? "student" : "students"} · ${formatNumber(category.points)} points`,
                }))}
              />
            );
          })}
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Most common activities"
          description="Activity names that appear on the most forms."
        >
          <BarList items={analytics.commonActivities} empty="No activities yet." />
        </ChartCard>

        <ChartCard title="Top places" description="Where activities took place.">
          <BarList items={analytics.places} empty="No places recorded yet." />
        </ChartCard>
      </div>
    </div>
  );
}

export function DepartmentsTab({ analytics }: { analytics: DashboardAnalytics }) {
  const { departments } = analytics;
  const completion: Series[] = [
    { key: "complete", label: "Complete", color: SERIES_COLORS[0] },
    { key: "incomplete", label: "Missing fields", color: NEUTRAL_COLOR },
  ];
  const byAverage = [...departments].sort((a, b) => b.avgPoints - a.avgPoints);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Students by department"
          description="Forms per department, split by whether they are complete."
        >
          <BarList
            empty="No students yet."
            series={completion}
            items={departments.map((entry) => ({
              label: entry.department,
              value: entry.students,
              display: `${entry.students} · ${formatPercent(entry.complete, entry.students)} complete`,
              segments: [
                { key: "complete", value: entry.complete },
                { key: "incomplete", value: entry.incomplete },
              ],
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Average points by department"
          description={`Mean points claimed per student. The target is ${POINTS_TARGET}.`}
        >
          <BarList
            empty="No students yet."
            items={byAverage.map((entry) => ({
              label: entry.department,
              value: entry.avgPoints,
              hint: `${entry.reachedTarget} of ${entry.students} reached ${POINTS_TARGET}`,
            }))}
          />
        </ChartCard>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-base">Department breakdown</CardTitle>
          <CardDescription>Every department with at least one form.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Activities</TableHead>
                  <TableHead className="text-right">Avg activities</TableHead>
                  <TableHead className="text-right">Avg points</TableHead>
                  <TableHead className="text-right">Reached {POINTS_TARGET}</TableHead>
                  <TableHead className="text-right">Complete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((entry) => (
                  <TableRow key={entry.department}>
                    <TableCell className="font-medium">{entry.department}</TableCell>
                    <TableCell className="text-right tabular-nums">{entry.students}</TableCell>
                    <TableCell className="text-right tabular-nums">{entry.activities}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(entry.avgActivities)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(entry.avgPoints)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.reachedTarget} ({formatPercent(entry.reachedTarget, entry.students)})
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.complete} ({formatPercent(entry.complete, entry.students)})
                    </TableCell>
                  </TableRow>
                ))}
                {departments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">
                      No students yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ChartCard
        title="Programme period"
        description="Students by the period entered on their form."
      >
        <BarList items={analytics.periods} empty="No students yet." />
      </ChartCard>
    </div>
  );
}

export function UsersTab({ analytics }: { analytics: DashboardAnalytics }) {
  const { totals, agents } = analytics;
  const edits = analytics.formEdits;

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatTile
          label="Registered users"
          value={formatNumber(totals.registeredUsers)}
          hint={`${totals.newUsersLast7Days} new in the last 7 days`}
          icon={Users}
        />
        <StatTile
          label="Email confirmed"
          value={formatNumber(totals.confirmedUsers)}
          hint={`${formatPercent(totals.confirmedUsers, totals.registeredUsers)} of registered users`}
          icon={MailCheck}
        />
        <StatTile
          label="Signed in, last 7 days"
          value={formatNumber(totals.activeLast7Days)}
          hint={`${totals.formsEditedLast7Days} forms edited in that time`}
          icon={CalendarClock}
        />
        <StatTile
          label="No form yet"
          value={formatNumber(totals.usersWithoutForms)}
          hint={`${formatPercent(totals.usersWithoutForms, totals.registeredUsers)} of registered users`}
          icon={UserX}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <SignupsCard days={analytics.dailySignups} />

        <ChartCard
          title="Form edits, last 30 days"
          description="Forms by the day they were last saved. A form saved twice counts once, on the later day."
          table={seriesTable(edits, "date", "Date", one("value", "Forms"), (key) =>
            formatDayKey(key, true)
          )}
        >
          <ColumnChart
            data={edits}
            xKey="date"
            series={one("value", "Forms")}
            formatX={formatDayKey}
            formatTooltipX={(key) => formatDayKey(key, true)}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Last sign-in"
          description="How recently each account last signed in."
        >
          <BarList
            items={analytics.signInRecency.map((bucket) => ({
              ...bucket,
              display: `${formatNumber(bucket.value)} · ${formatPercent(bucket.value, totals.registeredUsers)}`,
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Coding agent access"
          description="Students who connected a coding agent over MCP."
        >
          {agents ? (
            <BarList
              items={[
                { label: "Created an access token", value: agents.usersWithTokens },
                { label: "Used a token at least once", value: agents.usersWhoUsedOne },
                { label: "Used a token in the last 7 days", value: agents.usedLast7Days },
              ].map((row) => ({
                ...row,
                display: `${formatNumber(row.value)} · ${formatPercent(row.value, totals.registeredUsers)}`,
              }))}
            />
          ) : (
            <EmptyState>Agent tokens could not be read from this database.</EmptyState>
          )}
          {agents && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Bot className="size-3.5" />
              {agents.tokens} {agents.tokens === 1 ? "token" : "tokens"} in total.
              Percentages are of registered users.
            </p>
          )}
        </ChartCard>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-4 text-muted-foreground" />
            Accounts without a form ({analytics.accountsWithoutForms.length})
          </CardTitle>
          <CardDescription>
            Signed up but never saved a form, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.accountsWithoutForms.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.email ?? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {account.id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(account.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(account.lastSignInAt, "Never")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.confirmed ? "secondary" : "outline"}>
                        {account.confirmed ? "Confirmed" : "Unconfirmed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {analytics.accountsWithoutForms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                      Every account has a form.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function QualityTab({
  analytics,
  students,
}: {
  analytics: DashboardAnalytics;
  students: StudentSummary[];
}) {
  const { totals, evidence } = analytics;
  const incomplete = students
    .filter((student) => !student.isComplete)
    .sort((a, b) => b.missingFields.length - a.missingFields.length);
  const certificateOnly = evidence.withCertificate - evidence.withBoth;
  const photosOnly = evidence.withPhotos - evidence.withBoth;

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatTile
          label="Complete forms"
          value={formatNumber(totals.completeForms)}
          hint={`${formatPercent(totals.completeForms, totals.studentsWithForms)} of forms`}
          icon={CircleCheck}
        />
        <StatTile
          label="Forms missing fields"
          value={formatNumber(incomplete.length)}
          hint={`${formatPercent(incomplete.length, totals.studentsWithForms)} of forms`}
          icon={FileWarning}
        />
        <StatTile
          label="Activities without a certificate"
          value={formatNumber(evidence.activities - evidence.withCertificate)}
          hint={`of ${formatNumber(evidence.activities)} activities`}
          icon={ImageIcon}
        />
        <StatTile
          label="Activities with no evidence"
          value={formatNumber(evidence.withNeither)}
          hint="Neither a certificate nor a photo"
          icon={TriangleAlert}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="What is missing"
          description="Students with at least one gap of each kind."
        >
          <BarList
            empty="No form is missing anything."
            items={analytics.missingFields.map((field) => ({
              ...field,
              display: `${formatNumber(field.value)} · ${formatPercent(field.value, totals.studentsWithForms)}`,
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Evidence per activity"
          description={`${formatNumber(evidence.certificates)} certificates and ${formatNumber(evidence.photos)} photos uploaded.`}
        >
          <BarList
            empty="No activities yet."
            items={
              evidence.activities === 0
                ? []
                : [
                    { label: "Certificate and photos", value: evidence.withBoth },
                    { label: "Certificate only", value: certificateOnly },
                    { label: "Photos only", value: photosOnly },
                    { label: "No evidence", value: evidence.withNeither },
                  ].map((row) => ({
                    ...row,
                    display: `${formatNumber(row.value)} · ${formatPercent(row.value, evidence.activities)}`,
                  }))
            }
          />
        </ChartCard>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-base">
            Forms missing fields ({incomplete.length})
          </CardTitle>
          <CardDescription>Most gaps first.</CardDescription>
        </CardHeader>
        <CardContent>
          {incomplete.length === 0 ? (
            <EmptyState>Every form is complete.</EmptyState>
          ) : (
            <ul className="max-h-[420px] divide-y overflow-auto">
              {incomplete.map((student) => (
                <li key={student.userId}>
                  <Link
                    href={`/dashboard/${student.userId}?tab=issues`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-foreground/70"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {studentLabel(student)}
                    </span>
                    <Badge variant="outline" className="text-muted-foreground">
                      {student.missingFields.length} missing
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
