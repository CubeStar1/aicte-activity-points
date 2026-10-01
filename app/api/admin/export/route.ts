import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/admin/auth";
import { fetchAllStudents, fetchStudent } from "@/lib/admin/students";
import {
  ACTIVITY_COLUMNS,
  STUDENT_COLUMNS,
  activityRowsFor,
  toCsv,
} from "@/lib/admin/student-summary.mjs";

export const dynamic = "force-dynamic";

/**
 * Backs the dashboard download buttons. `scripts/export-data.mjs` does the same
 * aggregation offline, including the per-student asset downloads.
 *
 *   /api/admin/export?format=json            master JSON
 *   /api/admin/export?format=csv             per-student master CSV
 *   /api/admin/export?format=activities-csv  one row per activity
 *   /api/admin/export?userId=<uuid>          a single student's form JSON
 */
export async function GET(request: NextRequest) {
  const admin = await checkAdmin();
  if (!admin.ok) {
    const status = admin.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: admin.reason }, { status });
  }

  const params = request.nextUrl.searchParams;
  const userId = params.get("userId");
  const stamp = new Date().toISOString().slice(0, 10);

  const download = (body: string, filename: string, contentType: string) =>
    new NextResponse(body, {
      headers: {
        "Content-Type": `${contentType}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });

  if (userId) {
    const detail = await fetchStudent(userId);
    if (!detail) return NextResponse.json({ error: "not-found" }, { status: 404 });

    return download(
      JSON.stringify(
        { summary: detail.summary, formData: detail.formData },
        null,
        2
      ),
      `${detail.summary.folderName}.json`,
      "application/json"
    );
  }

  const format = params.get("format") ?? "json";
  const { students, usersWithoutForms, forms } = await fetchAllStudents();

  if (format === "csv") {
    return download(
      toCsv(students, STUDENT_COLUMNS),
      `aicte-students-${stamp}.csv`,
      "text/csv"
    );
  }

  if (format === "activities-csv") {
    const rows = students.flatMap((summary) =>
      activityRowsFor(summary, forms.get(summary.userId))
    );

    return download(
      toCsv(rows, ACTIVITY_COLUMNS),
      `aicte-activities-${stamp}.csv`,
      "text/csv"
    );
  }

  return download(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        studentCount: students.length,
        usersWithoutForms,
        students,
      },
      null,
      2
    ),
    `aicte-students-${stamp}.json`,
    "application/json"
  );
}
