import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AdminGate } from "@/components/admin/admin-gate";
import { DashboardView } from "@/components/admin/dashboard-view";
import { checkAdmin } from "@/lib/admin/auth";
import { buildDashboardAnalytics } from "@/lib/admin/analytics";
import { fetchAllStudents } from "@/lib/admin/students";

export const metadata: Metadata = {
  title: "Students Dashboard",
  description: "Every submitted AICTE activity points form",
};

// Always read live data — admins are usually checking what was just submitted.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await checkAdmin();
  if (!admin.ok) return <AdminGate reason={admin.reason} />;

  const [{ tab }, { students, forms, authUsers, agentTokens }] = await Promise.all([
    searchParams,
    fetchAllStudents(),
  ]);
  const analytics = buildDashboardAnalytics({ students, forms, authUsers, agentTokens });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Dashboard"
        description="Sign-ups, forms and activities across every student using this app."
      />

      <DashboardView analytics={analytics} students={students} initialTab={tab} />
    </div>
  );
}
