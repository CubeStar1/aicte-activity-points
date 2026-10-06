"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ChartNoAxesColumn, Table2, type LucideIcon } from "lucide-react";
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
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/admin/format";

/** Categorical slots, in the fixed order the palette was validated in. */
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

/** For the part of a whole that is context, not the point. */
export const NEUTRAL_COLOR = "var(--muted-foreground)";

export interface Series {
  key: string;
  label: string;
  color: string;
}

export interface TableView {
  columns: string[];
  rows: (string | number)[][];
}

/** Chart rows are plain objects read by key. */
type Row = object;

function cell(row: Row, key: string) {
  return (row as Record<string, unknown>)[key];
}

/** The table twin of a chart: one row per x value, one column per series. */
export function seriesTable(
  data: readonly Row[],
  xKey: string,
  xLabel: string,
  series: Series[],
  formatX: (value: string) => string = String
): TableView {
  return {
    columns: [xLabel, ...series.map((s) => s.label)],
    rows: data.map((row) => [
      formatX(String(cell(row, xKey))),
      ...series.map((s) => formatNumber(Number(cell(row, s.key)))),
    ]),
  };
}

function configFor(series: Series[]): ChartConfig {
  return Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }])
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        </div>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}

/**
 * A titled card around a chart. When `table` is given, a toggle swaps the
 * chart for the same numbers as a table.
 */
export function ChartCard({
  title,
  description,
  table,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  table?: TableView;
  children: React.ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const ToggleIcon = showTable ? ChartNoAxesColumn : Table2;

  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {table && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={() => setShowTable((value) => !value)}
              aria-label={showTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
              title={showTable ? "Show chart" : "Show table"}
            >
              <ToggleIcon className="size-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="min-w-0">
        {table && showTable ? <DataTable table={table} /> : children}
      </CardContent>
    </Card>
  );
}

export function DataTable({ table }: { table: TableView }) {
  return (
    <div className="max-h-[320px] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {table.columns.map((column, index) => (
              <TableHead key={column} className={index > 0 ? "text-right" : undefined}>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, index) => (
                <TableCell
                  key={index}
                  className={index > 0 ? "text-right tabular-nums" : "whitespace-normal"}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

interface CartesianProps {
  data: readonly Row[];
  xKey: string;
  series: Series[];
  formatX?: (value: string) => string;
  /** Used in the tooltip heading when it should say more than the axis tick. */
  formatTooltipX?: (value: string) => string;
  className?: string;
}

const AXIS = { tickLine: false, axisLine: false } as const;

/** Columns, one colour per series; several series stack. */
export function ColumnChart({
  data,
  xKey,
  series,
  formatX = String,
  formatTooltipX = formatX,
  className,
}: CartesianProps) {
  if (data.length === 0) return <EmptyState>Nothing to show yet.</EmptyState>;

  return (
    <ChartContainer
      config={configFor(series)}
      className={cn("aspect-auto h-[260px] w-full", className)}
    >
      <BarChart accessibilityLayer data={[...data]} margin={{ top: 8, right: 8, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          {...AXIS}
          dataKey={xKey}
          tickMargin={8}
          minTickGap={16}
          tickFormatter={(value) => formatX(String(value))}
        />
        <YAxis {...AXIS} width={36} allowDecimals={false} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                formatTooltipX(String(payload?.[0]?.payload?.[xKey] ?? ""))
              }
            />
          }
        />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((s, index) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="stack"
            fill={`var(--color-${s.key})`}
            // A surface-coloured stroke is the gap between stacked segments.
            stroke={series.length > 1 ? "var(--card)" : undefined}
            strokeWidth={series.length > 1 ? 2 : 0}
            radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
            maxBarSize={24}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/** Lines over time. `target` draws a labelled threshold. */
export function TrendChart({
  data,
  xKey,
  series,
  formatX = String,
  formatTooltipX = formatX,
  target,
  stepped = false,
  className,
}: CartesianProps & {
  target?: { value: number; label: string };
  stepped?: boolean;
}) {
  if (data.length === 0) return <EmptyState>Nothing to show yet.</EmptyState>;

  return (
    <ChartContainer
      config={configFor(series)}
      className={cn("aspect-auto h-[260px] w-full", className)}
    >
      <LineChart accessibilityLayer data={[...data]} margin={{ top: 16, right: 12, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          {...AXIS}
          dataKey={xKey}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => formatX(String(value))}
        />
        <YAxis
          {...AXIS}
          width={36}
          allowDecimals={false}
          domain={target ? [0, (max: number) => Math.max(max, target.value)] : undefined}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) =>
                formatTooltipX(String(payload?.[0]?.payload?.[xKey] ?? ""))
              }
            />
          }
        />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {target && (
          <ReferenceLine
            y={target.value}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: target.label,
              position: "insideTopLeft",
              fill: "var(--muted-foreground)",
              fontSize: 11,
            }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            type={stepped ? "stepAfter" : "monotone"}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            dot={data.length === 1 ? { r: 4 } : false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

export interface BarListItem {
  label: string;
  /** Shown at the end of the row; defaults to the summed value. */
  display?: React.ReactNode;
  value: number;
  /** Splits the bar into parts; their values should add up to `value`. */
  segments?: { key: string; value: number }[];
  hint?: React.ReactNode;
  href?: string;
  /** Overrides the list colour, to set one row apart from the rest. */
  color?: string;
}

/**
 * Horizontal bars with the label above each bar, for categories whose names
 * are too long for a chart axis. Every value is printed, so nothing depends
 * on hovering.
 */
export function BarList({
  items,
  series,
  color = SERIES_COLORS[0],
  max: sharedMax,
  empty = "Nothing to show yet.",
}: {
  items: BarListItem[];
  /** Names and colours for `segments`, in order. */
  series?: Series[];
  color?: string;
  /** Full-width value, for lists that must share a scale. */
  max?: number;
  empty?: string;
}) {
  if (items.length === 0) return <EmptyState>{empty}</EmptyState>;

  const max = sharedMax ?? Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {series && series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {items.map((item, itemIndex) => {
          const parts = item.segments ?? [{ key: "value", value: item.value }];
          const label = (
            <span className="min-w-0 break-words text-sm leading-snug" title={item.label}>
              {item.label}
            </span>
          );

          return (
            <li key={`${item.label}-${itemIndex}`} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                {item.href ? (
                  <Link href={item.href} className="min-w-0 hover:underline">
                    {label}
                  </Link>
                ) : (
                  label
                )}
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {item.display ?? formatNumber(item.value)}
                </span>
              </div>
              <div className="flex h-2 gap-0.5">
                {parts.map((part, index) => {
                  if (part.value <= 0) return null;
                  const seriesFor = series?.find((s) => s.key === part.key);
                  const isLast = parts.slice(index + 1).every((p) => p.value <= 0);

                  return (
                    <div
                      key={part.key}
                      className={cn("h-full min-w-0.5", isLast && "rounded-r-[4px]")}
                      style={{
                        width: `${(part.value / max) * 100}%`,
                        backgroundColor: seriesFor?.color ?? item.color ?? color,
                      }}
                      title={
                        seriesFor
                          ? `${seriesFor.label}: ${formatNumber(part.value)}`
                          : undefined
                      }
                    />
                  );
                })}
              </div>
              {item.hint && (
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One ratio against a limit. The track is a lighter step of the fill. */
export function Meter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-chart-1/20", className)}
    >
      <div
        className="h-full rounded-full bg-chart-1 transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
