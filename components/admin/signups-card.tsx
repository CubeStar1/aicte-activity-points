"use client";

import { useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ColumnChart,
  DataTable,
  SERIES_COLORS,
  seriesTable,
  type Series,
} from "@/components/admin/charts";
import type { DailySignups } from "@/lib/admin/analytics";
import { formatDayKey, formatMonthKey, formatNumber } from "@/lib/admin/format";

type Granularity = "day" | "week" | "month";
type Range = "30" | "90" | "365" | "all";

const GRANULARITIES: { value: Granularity; label: string; noun: string }[] = [
  { value: "day", label: "Daily", noun: "day" },
  { value: "week", label: "Weekly", noun: "week" },
  { value: "month", label: "Monthly", noun: "month" },
];

const RANGES: { value: Range; label: string }[] = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

const ACCOUNTS: Series[] = [
  { key: "accounts", label: "New accounts", color: SERIES_COLORS[0] },
];
const TABLE_SERIES: Series[] = [
  ...ACCOUNTS,
  { key: "forms", label: "New forms", color: SERIES_COLORS[1] },
];

/** The Monday of the week a `YYYY-MM-DD` day falls in. */
function weekStart(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function bucketKey(day: string, granularity: Granularity) {
  if (granularity === "week") return weekStart(day);
  if (granularity === "month") return day.slice(0, 7);
  return day;
}

function formatBucket(key: string, granularity: Granularity, long = false) {
  if (granularity === "month") return formatMonthKey(key);
  if (!long) return formatDayKey(key);
  return granularity === "week"
    ? `Week of ${formatDayKey(key, true)}`
    : formatDayKey(key, true);
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

/**
 * New accounts over time, re-bucketed in the browser by day, week or month.
 * The expand button opens the same chart larger, with its numbers as a table.
 */
export function SignupsCard({ days }: { days: DailySignups[] }) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [range, setRange] = useState<Range>("30");
  const [expanded, setExpanded] = useState(false);

  const buckets = useMemo(() => {
    const inRange = range === "all" ? days : days.slice(-Number(range));
    const grouped = new Map<string, DailySignups>();

    for (const day of inRange) {
      const key = bucketKey(day.date, granularity);
      const entry = grouped.get(key) ?? { date: key, accounts: 0, forms: 0 };
      entry.accounts += day.accounts;
      entry.forms += day.forms;
      grouped.set(key, entry);
    }
    return Array.from(grouped.values());
  }, [days, granularity, range]);

  const noun = GRANULARITIES.find((g) => g.value === granularity)!.noun;
  const total = buckets.reduce((sum, bucket) => sum + bucket.accounts, 0);
  const peak = buckets.reduce<DailySignups | null>(
    (best, bucket) => (!best || bucket.accounts > best.accounts ? bucket : best),
    null
  );

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={granularity}
        // Radix reports "" when the active item is pressed again; keep it on.
        onValueChange={(value) => value && setGranularity(value as Granularity)}
        aria-label="Group sign-ups by"
      >
        {GRANULARITIES.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Select value={range} onValueChange={(value) => setRange(value as Range)}>
        <SelectTrigger size="sm" className="w-[150px]" aria-label="Time range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const chart = (className?: string) => (
    <ColumnChart
      data={buckets}
      xKey="date"
      series={ACCOUNTS}
      formatX={(key) => formatBucket(key, granularity)}
      formatTooltipX={(key) => formatBucket(key, granularity, true)}
      className={className}
    />
  );

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">New sign-ups</CardTitle>
        <CardDescription>
          {formatNumber(total)} accounts created, per {noun}.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={() => setExpanded(true)}
            aria-label="Open new sign-ups in a larger view"
            title="Expand"
          >
            <Maximize2 className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        {controls}
        {chart()}
      </CardContent>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>New sign-ups</DialogTitle>
            <DialogDescription>
              Accounts created per {noun}, in India time.
            </DialogDescription>
          </DialogHeader>

          {controls}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Summary label="New accounts" value={formatNumber(total)} />
            <Summary
              label={`Average per ${noun}`}
              value={formatNumber(buckets.length ? total / buckets.length : 0)}
            />
            <Summary
              label={`Busiest ${noun}`}
              value={
                peak && peak.accounts > 0
                  ? `${formatNumber(peak.accounts)} · ${formatBucket(peak.date, granularity)}`
                  : "—"
              }
            />
            <Summary
              label="New forms"
              value={formatNumber(buckets.reduce((sum, b) => sum + b.forms, 0))}
            />
          </div>

          <div className="min-w-0">{chart("h-[45vh] min-h-[260px]")}</div>

          <DataTable
            table={seriesTable(
              [...buckets].reverse(),
              "date",
              granularity === "month" ? "Month" : granularity === "week" ? "Week of" : "Date",
              TABLE_SERIES,
              (key) =>
                granularity === "month" ? formatMonthKey(key) : formatDayKey(key, true)
            )}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
