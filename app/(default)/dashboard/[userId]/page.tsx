import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/admin-gate";
import { StudentDetail } from "@/components/admin/student-detail";
import { checkAdmin } from "@/lib/admin/auth";
import { cohortPositionFor } from "@/lib/admin/analytics";
import { fetchAllStudents } from "@/lib/admin/students";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student details",
};

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await checkAdmin();
  if (!admin.ok) return <AdminGate reason={admin.reason} />;

  // Everyone is loaded, not just this student, to place them among the rest.
  const [{ userId }, { tab }, { students, forms, agentTokens }] = await Promise.all([
    params,
    searchParams,
    fetchAllStudents(),
  ]);

  const summary = students.find((student) => student.userId === userId);
  if (!summary) notFound();

  const tokens = agentTokens?.filter((token) => token.user_id === userId);
  const lastUsedAt =
    tokens
      ?.map((token) => token.last_used_at ?? "")
      .sort()
      .pop() ?? "";

  return (
    <StudentDetail
      summary={summary}
      formData={forms.get(userId) ?? null}
      cohort={cohortPositionFor(summary, students)}
      agentAccess={tokens ? { tokens: tokens.length, lastUsedAt } : null}
      initialTab={tab}
    />
  );
}
