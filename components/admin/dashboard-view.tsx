"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ActivitiesTab,
  DepartmentsTab,
  OverviewTab,
  QualityTab,
  UsersTab,
} from "@/components/admin/dashboard-tabs";
import { StudentsTable } from "@/components/admin/students-table";
import { useTabParam } from "@/components/admin/use-tab-param";
import type { DashboardAnalytics } from "@/lib/admin/analytics";
import type { StudentSummary } from "@/lib/admin/student-summary.mjs";

const TABS = [
  "overview",
  "students",
  "activities",
  "departments",
  "users",
  "quality",
] as const;

export function DashboardView({
  analytics,
  students,
  initialTab,
}: {
  analytics: DashboardAnalytics;
  students: StudentSummary[];
  initialTab?: string;
}) {
  const [tab, selectTab] = useTabParam(TABS, initialTab);

  return (
    <Tabs value={tab} onValueChange={selectTab} className="gap-4">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="quality">Data quality</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">
        <OverviewTab analytics={analytics} />
      </TabsContent>
      <TabsContent value="students">
        <StudentsTable students={students} />
      </TabsContent>
      <TabsContent value="activities">
        <ActivitiesTab analytics={analytics} />
      </TabsContent>
      <TabsContent value="departments">
        <DepartmentsTab analytics={analytics} />
      </TabsContent>
      <TabsContent value="users">
        <UsersTab analytics={analytics} />
      </TabsContent>
      <TabsContent value="quality">
        <QualityTab analytics={analytics} students={students} />
      </TabsContent>
    </Tabs>
  );
}
