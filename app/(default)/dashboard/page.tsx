import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AdminGate } from "@/components/admin/admin-gate";
import { StatCards } from "@/components/admin/stat-cards";
import { StudentsTable } from "@/components/admin/students-table";
import { checkAdmin } from "@/lib/admin/auth";
import { fetchAllStudents } from "@/lib/admin/students";

export const metadata: Metadata = {
  title: "Students Dashboard",
  description: "Every submitted AICTE activity points form",
};

// Always read live data — admins are usually checking what was just submitted.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const admin = await checkAdmin();
  if (!admin.ok) return <AdminGate reason={admin.reason} />;

  const { students, usersWithoutForms } = await fetchAllStudents();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Students"
        description="Every AICTE activity points form submitted through this app."
      />

      <StatCards students={students} usersWithoutForms={usersWithoutForms.length} />

      <StudentsTable students={students} />
    </div>
  );
}
