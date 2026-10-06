"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  GraduationCap,
  Image as ImageIcon,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarList,
  ChartCard,
  ColumnChart,
  EmptyState,
  Meter,
  NEUTRAL_COLOR,
  SERIES_COLORS,
  StatGrid,
  StatTile,
  TrendChart,
  seriesTable,
  type Series,
} from "@/components/admin/charts";
import { useTabParam } from "@/components/admin/use-tab-param";
import { DownloadPDFButton } from "@/components/form-filler/download-pdf-button";
import { withDerived } from "@/lib/forms/derive";
import {
  POINTS_TARGET,
  missingFieldLabel,
  type CohortPosition,
} from "@/lib/admin/analytics";
import {
  formatDate,
  formatDateTime,
  formatDayKey,
  formatMonthKey,
  formatNumber,
} from "@/lib/admin/format";
import type { Activity, FormFillerData } from "@/lib/types/form-filler";
import { SEMESTERS } from "@/lib/types/form-filler";
import {
  collectAssets,
  type StudentSummary,
} from "@/lib/admin/student-summary.mjs";

const TABS = ["overview", "form", "activities", "assets", "issues", "json"] as const;

// The report is rendered in a web worker, which only exists in the browser.
const PDFPreview = dynamic(
  () =>
    import("@/components/form-filler/pdf-preview").then((mod) => mod.PDFPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading PDF viewer...
      </div>
    ),
  }
);

const POINTS: Series[] = [{ key: "points", label: "Points", color: SERIES_COLORS[0] }];

export interface AgentAccess {
  tokens: number;
  lastUsedAt: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function CopyIdButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-auto gap-2 py-1 font-mono text-xs"
      onClick={() => {
        navigator.clipboard.writeText(userId).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span className="break-all text-left">{userId}</span>
    </Button>
  );
}

/** Gaps reported for one activity, e.g. `activity[2].certificate`. */
function gapsForActivity(missingFields: string[], index: number) {
  const prefix = `activity[${index + 1}].`;
  return missingFields
    .filter((field) => field.startsWith(prefix))
    .map(missingFieldLabel);
}

function useActivityBreakdown(activities: Activity[]) {
  return useMemo(() => {
    const semesters = new Map<string, { label: string; points: number; activities: number }>(
      SEMESTERS.map((label) => [label, { label, points: 0, activities: 0 }])
    );
    const categories = new Map<string, { label: string; value: number; count: number }>();
    const byDay = new Map<string, number>();
    let undated = 0;

    for (const activity of activities) {
      const points = Number(activity.pointsEarned) || 0;

      const semester = activity.semester?.trim() || "Unspecified";
      const semesterEntry = semesters.get(semester) ?? {
        label: semester,
        points: 0,
        activities: 0,
      };
      semesterEntry.points += points;
      semesterEntry.activities += 1;
      semesters.set(semester, semesterEntry);

      const category = activity.aicteMapping?.trim() || "Not mapped";
      const categoryEntry = categories.get(category) ?? {
        label: category,
        value: 0,
        count: 0,
      };
      categoryEntry.value += points;
      categoryEntry.count += 1;
      categories.set(category, categoryEntry);

      const day = (activity.endDate || activity.startDate || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) byDay.set(day, (byDay.get(day) ?? 0) + points);
      else undated += 1;
    }

    let running = 0;
    const timeline = Array.from(byDay.keys())
      .sort()
      .map((date) => {
        running += byDay.get(date)!;
        return { date, points: running };
      });

    return {
      semesters: Array.from(semesters.values()),
      categories: Array.from(categories.values()).sort((a, b) => b.value - a.value),
      timeline,
      undated,
    };
  }, [activities]);
}

export function StudentDetail({
  summary,
  formData,
  cohort,
  agentAccess,
  initialTab,
}: {
  summary: StudentSummary;
  formData: FormFillerData | null;
  cohort: CohortPosition;
  /** `null` when agent tokens could not be read. */
  agentAccess: AgentAccess | null;
  initialTab?: string;
}) {
  const [tab, selectTab] = useTabParam(TABS, initialTab);

  const activities = useMemo(() => formData?.activities ?? [], [formData]);
  const evaluations = formData?.evaluations ?? [];
  // The same recalculated form the student sees and downloads.
  const report = useMemo(() => (formData ? withDerived(formData) : null), [formData]);
  const assets = useMemo(() => collectAssets(formData), [formData]);
  const breakdown = useActivityBreakdown(activities);

  const points = summary.computedPoints;
  const reachedTarget = points >= POINTS_TARGET;
  const formGaps = summary.missingFields.filter(
    (field) => !field.startsWith("activity[")
  );
  const issueCount = summary.missingFields.length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
            <Link href="/dashboard?tab=students">
              <ArrowLeft className="size-4" />
              All students
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{summary.name || "Unnamed student"}</h1>
          <p className="break-all font-mono text-sm text-muted-foreground">
            {summary.usn || "no USN"} · {summary.email ?? "no email"}
          </p>
          {summary.department && (
            <p className="text-sm text-muted-foreground">
              {summary.department}
              {summary.period ? ` · ${summary.period}` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summary.isComplete ? (
            <Badge variant="secondary">
              <CircleCheck />
              Complete
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <FileWarning />
              {summary.missingFields.length} missing
            </Badge>
          )}
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href={`/api/admin/export?userId=${summary.userId}`} download>
              <Download className="size-4" />
              Form JSON
            </a>
          </Button>
        </div>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Points claimed</p>
            <p className="text-5xl font-semibold">
              {formatNumber(points)}
              <span className="ml-2 text-lg font-normal text-muted-foreground">
                of {POINTS_TARGET}
              </span>
            </p>
            <Meter
              value={points}
              max={POINTS_TARGET}
              label={`Points towards ${POINTS_TARGET}`}
            />
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {reachedTarget ? (
                <>
                  <CircleCheck className="size-4" />
                  Target reached
                  {points > POINTS_TARGET ? `, ${points - POINTS_TARGET} over` : ""}
                </>
              ) : (
                `${formatNumber(POINTS_TARGET - points)} more needed to reach the target`
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <Field
              label="Rank by points"
              value={`${cohort.rank} of ${cohort.cohortSize}`}
            />
            <Field
              label="All students, average"
              value={formatNumber(cohort.cohortAvgPoints)}
            />
            <Field
              label="All students, median"
              value={formatNumber(cohort.cohortMedianPoints)}
            />
            <Field
              label={`Department average (${cohort.departmentSize})`}
              value={summary.department ? formatNumber(cohort.departmentAvgPoints) : ""}
            />
          </div>
        </CardContent>
      </Card>

      <StatGrid>
        <StatTile
          label="Activities"
          value={summary.activityCount}
          hint={`${formatNumber(summary.totalDurationDays)} days in total`}
          icon={ActivityIcon}
        />
        <StatTile
          label="Hours"
          value={formatNumber(summary.totalHours)}
          hint={
            summary.activityCount
              ? `${formatNumber(summary.totalHours / summary.activityCount)} per activity`
              : undefined
          }
          icon={Clock}
        />
        <StatTile
          label="Assets"
          value={summary.assetCount}
          hint={`${summary.certificateImageCount} certificates · ${summary.photoCount} photos`}
          icon={ImageIcon}
        />
        <StatTile
          label="Semesters covered"
          value={summary.semesters.length}
          hint={summary.semesters.length ? `Sem ${summary.semesters.join(", ")}` : undefined}
          icon={GraduationCap}
        />
      </StatGrid>

      <Tabs value={tab} onValueChange={selectTab} className="gap-4">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
            <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
            <TabsTrigger value="issues">Issues ({issueCount})</TabsTrigger>
            <TabsTrigger value="json">Raw JSON</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Points built up"
              description={
                breakdown.undated
                  ? `Running total after each dated activity. ${breakdown.undated} without a date left out.`
                  : "Running total after each activity, in date order."
              }
              table={seriesTable(breakdown.timeline, "date", "Date", POINTS, (key) =>
                formatDayKey(key, true)
              )}
            >
              <TrendChart
                data={breakdown.timeline}
                xKey="date"
                series={POINTS}
                formatX={(key) => formatMonthKey(key.slice(0, 7))}
                formatTooltipX={(key) => formatDayKey(key, true)}
                target={{ value: POINTS_TARGET, label: `Target ${POINTS_TARGET}` }}
                stepped
              />
            </ChartCard>

            <ChartCard
              title="Points by semester"
              description="Points claimed for activities in each semester."
              table={seriesTable(breakdown.semesters, "label", "Semester", [
                ...POINTS,
                { key: "activities", label: "Activities", color: SERIES_COLORS[1] },
              ])}
            >
              {activities.length === 0 ? (
                <EmptyState>No activities recorded.</EmptyState>
              ) : (
                <ColumnChart
                  data={breakdown.semesters}
                  xKey="label"
                  series={POINTS}
                  formatTooltipX={(label) =>
                    /^\d+$/.test(label) ? `Semester ${label}` : label
                  }
                />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Points by AICTE category"
              description="Where this student's points come from."
            >
              <BarList
                empty="No activities recorded."
                items={breakdown.categories.map((category) => ({
                  label: category.label,
                  value: category.value,
                  hint: `${category.count} ${category.count === 1 ? "activity" : "activities"}`,
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Compared with others"
              description="Points against the averages and the target."
            >
              <BarList
                items={[
                  { label: summary.name || "This student", value: points },
                  ...(summary.department
                    ? [
                        {
                          label: `Department average (${cohort.departmentSize})`,
                          value: cohort.departmentAvgPoints,
                          color: NEUTRAL_COLOR,
                        },
                      ]
                    : []),
                  {
                    label: `All students average (${cohort.cohortSize})`,
                    value: cohort.cohortAvgPoints,
                    color: NEUTRAL_COLOR,
                  },
                  { label: "Target", value: POINTS_TARGET, color: NEUTRAL_COLOR },
                ]}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base">Form details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" value={summary.name} />
                <Field label="USN" value={summary.usn} />
                <Field label="Department" value={summary.department} />
                <Field label="Period" value={summary.period} />
                <Field
                  label="Activity window"
                  value={
                    summary.firstActivityDate
                      ? `${formatDate(summary.firstActivityDate)} → ${formatDate(summary.lastActivityDate)}`
                      : ""
                  }
                />
                <Field label="Export folder" value={summary.folderName} />
                <Separator className="sm:col-span-2" />
                <Field label="Counsellor" value={summary.counsellor} />
                <Field label="Evaluator 1" value={summary.evaluator1} />
                <Field label="Evaluator 2" value={summary.evaluator2} />
              </CardContent>
            </Card>

            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" value={summary.email} />
                <Field
                  label="Email confirmed"
                  value={formatDate(summary.emailConfirmedAt, "Not confirmed")}
                />
                <Field label="Signed up" value={formatDateTime(summary.signedUpAt)} />
                <Field
                  label="Last sign-in"
                  value={formatDateTime(summary.lastSignInAt, "Never")}
                />
                <Field label="Form created" value={formatDateTime(summary.createdAt)} />
                <Field label="Form last saved" value={formatDateTime(summary.updatedAt)} />
                <Field
                  label="Coding agent"
                  value={
                    agentAccess === null
                      ? "Unknown"
                      : agentAccess.tokens === 0
                        ? "Not connected"
                        : `${agentAccess.tokens} ${agentAccess.tokens === 1 ? "token" : "tokens"}, last used ${formatDate(agentAccess.lastUsedAt, "never")}`
                  }
                />
                <div className="space-y-0.5 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">User id</p>
                  <CopyIdButton userId={summary.userId} />
                </div>
              </CardContent>
            </Card>
          </div>

          {evaluations.length > 0 && (
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base">Evaluation sheet</CardTitle>
                <CardDescription>As it appears in the generated report.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sl</TableHead>
                        <TableHead>Type of work</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations.map((entry, index) => (
                        <TableRow key={`${entry.slNo}-${index}`}>
                          <TableCell>{entry.slNo}</TableCell>
                          <TableCell className="whitespace-normal">{entry.typeOfWork}</TableCell>
                          <TableCell>{entry.duration}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.hoursSpent}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.pointsEarned}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="form">
          {report ? (
            <Card className="gap-0 overflow-hidden py-0">
              <div className="@container flex items-center justify-between gap-3 border-b p-3 sm:px-4">
                <p className="min-w-0 text-sm text-muted-foreground">
                  The report as the student sees it, built from their saved form.
                </p>
                <DownloadPDFButton data={report} />
              </div>
              <div className="h-[80vh] min-h-[480px] bg-muted/50">
                <PDFPreview data={report} />
              </div>
            </Card>
          ) : (
            <EmptyState>This student has not saved a form yet.</EmptyState>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-3">
          {activities.map((activity, index) => {
            const gaps = gapsForActivity(summary.missingFields, index);

            return (
              <Card key={activity.id ?? index} className="gap-0 py-0">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {activity.slNo || index + 1}. {activity.name || "Untitled activity"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activity.aicteMapping || "No AICTE mapping"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Sem {activity.semester || "—"}</Badge>
                      <Badge>{activity.pointsEarned} pts</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {formatDate(activity.startDate, "?")} → {formatDate(activity.endDate, "?")} (
                      {activity.duration} d)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {activity.place || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {activity.hoursSpent} hours
                    </span>
                    <span>Report page {activity.detailedReportPageNo || "—"}</span>
                  </div>

                  {gaps.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TriangleAlert className="size-3.5 text-muted-foreground" />
                      {gaps.map((gap) => (
                        <Badge key={gap} variant="outline" className="text-muted-foreground">
                          Missing: {gap}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {(activity.description || activity.outcomes) && (
                    <>
                      <Separator />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Description" value={activity.description} />
                        <Field label="Outcomes" value={activity.outcomes} />
                      </div>
                    </>
                  )}

                  {(activity.certificateImage || activity.photos?.length > 0) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[activity.certificateImage, ...(activity.photos ?? [])]
                        .filter(Boolean)
                        .map((url, assetIndex) => (
                          <a
                            key={`${url}-${assetIndex}`}
                            href={url as string}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative size-24 overflow-hidden rounded-md border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url as string}
                              alt={
                                assetIndex === 0 && activity.certificateImage
                                  ? "Certificate"
                                  : `Photo ${assetIndex}`
                              }
                              loading="lazy"
                              className="size-full object-cover transition group-hover:scale-105"
                            />
                          </a>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {activities.length === 0 && <EmptyState>No activities recorded.</EmptyState>}
        </TabsContent>

        <TabsContent value="assets">
          {assets.length === 0 ? (
            <EmptyState>No assets uploaded.</EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((asset, index) => (
                <Card key={`${asset.url}-${index}`} className="gap-0 overflow-hidden py-0">
                  <a href={asset.url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={`${asset.kind} for ${asset.activityName}`}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                  <div className="space-y-1 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={asset.kind === "certificate" ? "default" : "secondary"}>
                        {asset.kind}
                      </Badge>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Open original"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {asset.slNo}. {asset.activityName || "Untitled"}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          {issueCount === 0 && (
            <EmptyState>Nothing is missing from this form.</EmptyState>
          )}

          {formGaps.length > 0 && (
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base">Missing from the form</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {formGaps.map((field) => (
                  <Badge key={field} variant="outline">
                    {missingFieldLabel(field)}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {activities.some((_, index) => gapsForActivity(summary.missingFields, index).length > 0) && (
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base">Missing from activities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {activities.map((activity, index) => {
                    const gaps = gapsForActivity(summary.missingFields, index);
                    if (gaps.length === 0) return null;

                    return (
                      <li
                        key={activity.id ?? index}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                      >
                        <span className="min-w-0 text-sm font-medium">
                          {activity.slNo || index + 1}. {activity.name || "Untitled activity"}
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          {gaps.map((gap) => (
                            <Badge key={gap} variant="outline" className="text-muted-foreground">
                              {gap}
                            </Badge>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="json">
          <Card className="gap-0 py-0">
            <CardContent className="p-0">
              <pre className="max-h-[70vh] overflow-auto p-4 text-xs leading-relaxed">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
