import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/admin-gate";
import { StudentDetail } from "@/components/admin/student-detail";
import { checkAdmin } from "@/lib/admin/auth";
import { fetchStudent } from "@/lib/admin/students";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student details",
};

export default async function StudentPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const admin = await checkAdmin();
  if (!admin.ok) return <AdminGate reason={admin.reason} />;

  const { userId } = await params;
  const detail = await fetchStudent(userId);
  if (!detail) notFound();

  return <StudentDetail summary={detail.summary} formData={detail.formData} />;
}
