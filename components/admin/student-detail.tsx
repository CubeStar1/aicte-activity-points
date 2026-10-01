"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { FormFillerData } from "@/lib/types/form-filler";
import {
  collectAssets,
  type StudentSummary,
} from "@/lib/admin/student-summary.mjs";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value || "—"}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CopyIdButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 font-mono text-xs"
      onClick={() => {
        navigator.clipboard.writeText(userId).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {userId}
    </Button>
  );
}

export function StudentDetail({
  summary,
  formData,
}: {
  summary: StudentSummary;
  formData: FormFillerData | null;
}) {
  const activities = formData?.activities ?? [];
  const evaluations = formData?.evaluations ?? [];
  const assets = useMemo(() => collectAssets(formData), [formData]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              All students
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{summary.name || "Unnamed student"}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {summary.usn || "no USN"} · {summary.email ?? "no email"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {summary.isComplete ? (
            <Badge variant="secondary">Complete</Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <FileWarning className="size-3" />
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Points" value={summary.computedPoints} />
        <Stat label="Activities" value={summary.activityCount} />
        <Stat label="Hours" value={summary.totalHours} />
        <Stat label="Assets" value={summary.assetCount} />
        <Stat label="Declared total" value={summary.declaredPoints} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
          <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
          <TabsTrigger value="json">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
              <Field label="Name" value={summary.name} />
              <Field label="USN" value={summary.usn} />
              <Field label="Department" value={summary.department} />
              <Field label="Period" value={summary.period} />
              <Field label="Email" value={summary.email} />
              <Field label="Export folder" value={summary.folderName} />
              <Field label="Semesters" value={summary.semesters.join(", ")} />
              <Field
                label="Activity window"
                value={
                  summary.firstActivityDate
                    ? `${summary.firstActivityDate} → ${summary.lastActivityDate}`
                    : ""
                }
              />
              <Field
                label="Last updated"
                value={new Date(summary.updatedAt).toLocaleString()}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
              <Field label="Counsellor" value={summary.counsellor} />
              <Field label="Evaluator 1" value={summary.evaluator1} />
              <Field label="Evaluator 2" value={summary.evaluator2} />
            </CardContent>
          </Card>

          {summary.missingFields.length > 0 && (
            <Card>
              <CardContent className="space-y-2 p-4 sm:p-6">
                <p className="text-sm font-medium">Missing fields</p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.missingFields.map((field) => (
                    <Badge key={field} variant="outline" className="font-mono text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {evaluations.length > 0 && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <p className="mb-3 text-sm font-medium">Evaluation sheet</p>
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
                          <TableCell>{entry.typeOfWork}</TableCell>
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

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            User id:
            <CopyIdButton userId={summary.userId} />
          </div>
        </TabsContent>

        <TabsContent value="activities" className="mt-4 space-y-3">
          {activities.map((activity, index) => (
            <Card key={activity.id ?? index}>
              <CardContent className="space-y-3 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
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

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    {activity.startDate || "?"} → {activity.endDate || "?"} (
                    {activity.duration} d)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {activity.place || "—"}
                  </span>
                  <span>{activity.hoursSpent} hours</span>
                  <span>Report page {activity.detailedReportPageNo || "—"}</span>
                </div>

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
          ))}

          {activities.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No activities recorded.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          {assets.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No assets uploaded.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((asset, index) => (
                <Card key={`${asset.url}-${index}`} className="overflow-hidden py-0">
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

        <TabsContent value="json" className="mt-4">
          <Card>
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
