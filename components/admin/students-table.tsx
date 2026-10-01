"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StudentSummary } from "@/lib/admin/student-summary.mjs";

type SortKey =
  | "usn"
  | "name"
  | "department"
  | "computedPoints"
  | "activityCount"
  | "assetCount"
  | "updatedAt";

type Completeness = "all" | "complete" | "incomplete";

const SORT_LABELS: Record<SortKey, string> = {
  usn: "USN",
  name: "Name",
  department: "Department",
  computedPoints: "Points",
  activityCount: "Activities",
  assetCount: "Assets",
  updatedAt: "Last Updated",
};

function compare(a: StudentSummary, b: StudentSummary, key: SortKey) {
  const left = a[key];
  const right = b[key];

  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export function StudentsTable({ students }: { students: StudentSummary[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [completeness, setCompleteness] = useState<Completeness>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortAsc, setSortAsc] = useState(false);

  const departments = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.department).filter(Boolean))).sort(),
    [students]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = students.filter((student) => {
      if (department !== "all" && student.department !== department) return false;
      if (completeness === "complete" && !student.isComplete) return false;
      if (completeness === "incomplete" && student.isComplete) return false;
      if (!needle) return true;

      return [student.usn, student.name, student.email, student.department, student.userId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });

    return filtered.sort((a, b) => (sortAsc ? 1 : -1) * compare(a, b, sortKey));
  }, [students, query, department, completeness, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((asc) => !asc);
      return;
    }
    setSortKey(key);
    setSortAsc(key === "usn" || key === "name" || key === "department");
  }

  function SortButton({ column }: { column: SortKey }) {
    const active = sortKey === column;
    const Icon = active ? (sortAsc ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
        data-active={active}
      >
        {SORT_LABELS[column]}
        <Icon className={active ? "size-3.5" : "size-3.5 opacity-40"} />
      </button>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by USN, name, email or user id"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={completeness}
              onValueChange={(value) => setCompleteness(value as Completeness)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>

            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href="/api/admin/export?format=csv" download>
                <Download className="size-4" />
                CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href="/api/admin/export?format=activities-csv" download>
                <Download className="size-4" />
                Activities
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href="/api/admin/export?format=json" download>
                <Download className="size-4" />
                JSON
              </a>
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {visible.length} of {students.length} students
        </p>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">
                  <SortButton column="usn" />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton column="name" />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton column="department" />
                </TableHead>
                <TableHead className="text-right text-muted-foreground">
                  <SortButton column="computedPoints" />
                </TableHead>
                <TableHead className="text-right text-muted-foreground">
                  <SortButton column="activityCount" />
                </TableHead>
                <TableHead className="text-right text-muted-foreground">
                  <SortButton column="assetCount" />
                </TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton column="updatedAt" />
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((student) => (
                <TableRow key={student.userId} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-medium">
                    {student.usn || (
                      <span className="text-muted-foreground">no USN</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{student.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {student.email ?? student.userId}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                    {student.department || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {student.computedPoints}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {student.activityCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center justify-end gap-1">
                      <ImageIcon className="size-3.5 text-muted-foreground" />
                      {student.assetCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    {student.isComplete ? (
                      <Badge variant="secondary">Complete</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {student.missingFields.length} missing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(student.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        href={`/dashboard/${student.userId}`}
                        aria-label={`Open ${student.name || student.usn || student.userId}`}
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {visible.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No students match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
