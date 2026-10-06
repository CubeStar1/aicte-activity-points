import type { FormFillerData } from "@/lib/types/form-filler";
import { SEMESTERS } from "@/lib/types/form-filler";
import type { AuthUserLite, StudentSummary } from "@/lib/admin/student-summary.mjs";
import type { AgentTokenLite } from "@/lib/admin/students";

/**
 * Aggregates for the admin dashboard. Everything here is computed on the
 * server from data already loaded for the students table, and the result is
 * plain JSON so it can be handed straight to the client chart components.
 */

/** Points a student needs for the degree. */
export const POINTS_TARGET = 100;

/** Dates are bucketed in the students' timezone, not the server's. */
const TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CountDatum {
  label: string;
  value: number;
}

export interface GrowthPoint {
  /** Start of the bucket, `YYYY-MM-DD`. */
  date: string;
  users: number;
  forms: number;
}

/** One calendar day's new accounts and new forms. */
export interface DailySignups {
  /** `YYYY-MM-DD`. */
  date: string;
  accounts: number;
  forms: number;
}

export interface SemesterDatum {
  label: string;
  activities: number;
  points: number;
  hours: number;
}

export interface CategoryDatum {
  label: string;
  activities: number;
  points: number;
  students: number;
}

export interface MonthDatum {
  /** `YYYY-MM`. */
  month: string;
  activities: number;
  points: number;
}

export interface DepartmentDatum {
  department: string;
  students: number;
  complete: number;
  incomplete: number;
  reachedTarget: number;
  activities: number;
  totalPoints: number;
  avgPoints: number;
  avgActivities: number;
}

export interface StudentRef {
  userId: string;
  name: string;
  usn: string;
  department: string;
  points: number;
  activities: number;
  updatedAt: string;
}

export interface AccountRef {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string;
  confirmed: boolean;
}

export interface DashboardAnalytics {
  generatedAt: string;
  totals: {
    registeredUsers: number;
    confirmedUsers: number;
    studentsWithForms: number;
    usersWithoutForms: number;
    withActivities: number;
    completeForms: number;
    reachedTarget: number;
    activities: number;
    hours: number;
    points: number;
    assets: number;
    avgPoints: number;
    medianPoints: number;
    avgActivities: number;
    avgHoursPerActivity: number;
    avgPointsPerActivity: number;
    activeLast7Days: number;
    newUsersLast7Days: number;
    formsEditedLast7Days: number;
  };
  funnel: CountDatum[];
  growth: { bucket: "day" | "week"; points: GrowthPoint[] };
  /** Every day from the first sign-up to today, so the client can re-bucket. */
  dailySignups: DailySignups[];
  /** Forms by the day they were last edited, over the last 30 days. */
  formEdits: { date: string; value: number }[];
  pointsDistribution: CountDatum[];
  activityCountDistribution: CountDatum[];
  semesters: SemesterDatum[];
  categories: CategoryDatum[];
  activityMonths: MonthDatum[];
  places: CountDatum[];
  commonActivities: CountDatum[];
  departments: DepartmentDatum[];
  periods: CountDatum[];
  signInRecency: CountDatum[];
  /** Students affected by each kind of missing field. */
  missingFields: CountDatum[];
  evidence: {
    activities: number;
    withCertificate: number;
    withPhotos: number;
    withBoth: number;
    withNeither: number;
    certificates: number;
    photos: number;
  };
  topStudents: StudentRef[];
  recentlyUpdated: StudentRef[];
  accountsWithoutForms: AccountRef[];
  /** `null` when agent tokens could not be read. */
  agents: {
    tokens: number;
    usersWithTokens: number;
    usersWhoUsedOne: number;
    usedLast7Days: number;
  } | null;
}

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD` in the students' timezone, or "" for a missing/invalid date. */
function dayKey(value: string | null | undefined | Date): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dayFormat.format(date);
}

function keyToUtc(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The Monday of the week a day falls in. */
function weekStart(key: string): string {
  const ms = keyToUtc(key);
  const weekday = (new Date(ms).getUTCDay() + 6) % 7;
  return utcToKey(ms - weekday * DAY_MS);
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(total: number, count: number): number {
  return count ? round(total / count) : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : round((sorted[middle - 1] + sorted[middle]) / 2);
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Count labels case-insensitively, keeping the first spelling seen. */
function tally(labels: string[], limit?: number): CountDatum[] {
  const counts = new Map<string, CountDatum>();

  for (const label of labels) {
    const key = label.toLowerCase().replace(/\s+/g, " ");
    const entry = counts.get(key);
    if (entry) entry.value += 1;
    else counts.set(key, { label, value: 1 });
  }

  const sorted = Array.from(counts.values()).sort(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label)
  );
  return limit ? sorted.slice(0, limit) : sorted;
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  "student.name": "Student name",
  "student.usn": "USN",
  "student.department": "Department",
  activities: "No activities at all",
  "activity.name": "Activity name",
  "activity.semester": "Activity semester",
  "activity.aicteMapping": "AICTE mapping",
  "activity.certificate": "Certificate image",
  "signatories.counsellor": "Counsellor",
  "signatories.evaluator1": "Evaluator 1",
  "signatories.evaluator2": "Evaluator 2",
};

/** `activity[3].name` and `activity[7].name` are the same kind of gap. */
export function missingFieldLabel(field: string): string {
  const kind = field.replace(/^activity\[\d+\]/, "activity");
  return MISSING_FIELD_LABELS[kind] ?? field;
}

function studentRef(student: StudentSummary): StudentRef {
  return {
    userId: student.userId,
    name: student.name,
    usn: student.usn,
    department: student.department,
    points: student.computedPoints,
    activities: student.activityCount,
    updatedAt: student.updatedAt,
  };
}

function buildGrowth(
  userDays: string[],
  formDays: string[],
  today: string
): DashboardAnalytics["growth"] {
  const all = [...userDays, ...formDays].filter(Boolean).sort();
  if (all.length === 0) return { bucket: "day", points: [] };

  const first = all[0];
  const spanDays = (keyToUtc(today) - keyToUtc(first)) / DAY_MS;
  const bucket = spanDays > 90 ? "week" : "day";
  const step = bucket === "week" ? 7 * DAY_MS : DAY_MS;
  const bucketOf = (key: string) => (bucket === "week" ? weekStart(key) : key);

  const newUsers = new Map<string, number>();
  const newForms = new Map<string, number>();
  for (const key of userDays.filter(Boolean)) {
    newUsers.set(bucketOf(key), (newUsers.get(bucketOf(key)) ?? 0) + 1);
  }
  for (const key of formDays.filter(Boolean)) {
    newForms.set(bucketOf(key), (newForms.get(bucketOf(key)) ?? 0) + 1);
  }

  const points: GrowthPoint[] = [];
  let users = 0;
  let forms = 0;

  for (let ms = keyToUtc(bucketOf(first)); ms <= keyToUtc(today); ms += step) {
    const date = utcToKey(ms);
    users += newUsers.get(date) ?? 0;
    forms += newForms.get(date) ?? 0;
    points.push({ date, users, forms });
  }

  return { bucket, points };
}

function buildDailySignups(
  userDays: string[],
  formDays: string[],
  today: string
): DailySignups[] {
  const count = (days: string[]) => {
    const counts = new Map<string, number>();
    for (const key of days.filter(Boolean)) counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  };
  const accounts = count(userDays);
  const forms = count(formDays);

  const first = [...accounts.keys(), ...forms.keys()].sort()[0];
  if (!first) return [];

  const days: DailySignups[] = [];
  for (let ms = keyToUtc(first); ms <= keyToUtc(today); ms += DAY_MS) {
    const date = utcToKey(ms);
    days.push({ date, accounts: accounts.get(date) ?? 0, forms: forms.get(date) ?? 0 });
  }
  return days;
}

function buildMonths(months: Map<string, MonthDatum>): MonthDatum[] {
  const keys = Array.from(months.keys()).sort();
  if (keys.length === 0) return [];

  const [firstYear, firstMonth] = keys[0].split("-").map(Number);
  const [lastYear, lastMonth] = keys[keys.length - 1].split("-").map(Number);
  const span = (lastYear - firstYear) * 12 + (lastMonth - firstMonth);

  // A stray date decades away would otherwise pad the chart with empty months.
  if (span > 72) return keys.map((key) => months.get(key)!);

  const filled: MonthDatum[] = [];
  for (let offset = 0; offset <= span; offset += 1) {
    const index = firstMonth - 1 + offset;
    const month = `${firstYear + Math.floor(index / 12)}-${String(
      (index % 12) + 1
    ).padStart(2, "0")}`;
    filled.push(months.get(month) ?? { month, activities: 0, points: 0 });
  }
  return filled;
}

export function buildDashboardAnalytics({
  students,
  forms,
  authUsers,
  agentTokens,
  now = new Date(),
}: {
  students: StudentSummary[];
  forms: Map<string, FormFillerData | null>;
  authUsers: AuthUserLite[];
  agentTokens: AgentTokenLite[] | null;
  now?: Date;
}): DashboardAnalytics {
  const today = dayKey(now);
  const nowMs = now.getTime();
  const within = (value: string | null | undefined, days: number) => {
    if (!value) return false;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) && nowMs - ms <= days * DAY_MS;
  };

  // Per-activity aggregates.
  const semesters = new Map<string, SemesterDatum>(
    SEMESTERS.map((label) => [label, { label, activities: 0, points: 0, hours: 0 }])
  );
  const categories = new Map<string, CategoryDatum & { owners: Set<string> }>();
  const months = new Map<string, MonthDatum>();
  const places: string[] = [];
  const activityNames: string[] = [];
  const evidence = {
    activities: 0,
    withCertificate: 0,
    withPhotos: 0,
    withBoth: 0,
    withNeither: 0,
    certificates: 0,
    photos: 0,
  };

  for (const student of students) {
    const activities = forms.get(student.userId)?.activities;
    if (!Array.isArray(activities)) continue;

    for (const activity of activities) {
      const points = num(activity?.pointsEarned);
      const hours = num(activity?.hoursSpent);

      const semester = str(activity?.semester) || "Unspecified";
      const semesterEntry = semesters.get(semester) ?? {
        label: semester,
        activities: 0,
        points: 0,
        hours: 0,
      };
      semesterEntry.activities += 1;
      semesterEntry.points += points;
      semesterEntry.hours += hours;
      semesters.set(semester, semesterEntry);

      const category = str(activity?.aicteMapping) || "Not mapped";
      const categoryEntry = categories.get(category) ?? {
        label: category,
        activities: 0,
        points: 0,
        students: 0,
        owners: new Set<string>(),
      };
      categoryEntry.activities += 1;
      categoryEntry.points += points;
      categoryEntry.owners.add(student.userId);
      categories.set(category, categoryEntry);

      const month = str(activity?.startDate).slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) {
        const monthEntry = months.get(month) ?? { month, activities: 0, points: 0 };
        monthEntry.activities += 1;
        monthEntry.points += points;
        months.set(month, monthEntry);
      }

      if (str(activity?.place)) places.push(str(activity.place));
      if (str(activity?.name)) activityNames.push(str(activity.name));

      const hasCertificate = Boolean(str(activity?.certificateImage));
      const photoCount = Array.isArray(activity?.photos)
        ? activity.photos.filter((photo) => str(photo)).length
        : 0;
      evidence.activities += 1;
      evidence.certificates += hasCertificate ? 1 : 0;
      evidence.photos += photoCount;
      if (hasCertificate) evidence.withCertificate += 1;
      if (photoCount > 0) evidence.withPhotos += 1;
      if (hasCertificate && photoCount > 0) evidence.withBoth += 1;
      if (!hasCertificate && photoCount === 0) evidence.withNeither += 1;
    }
  }

  // Per-student aggregates.
  const departments = new Map<string, DepartmentDatum>();
  const missing = new Map<string, number>();
  const pointBins = [
    { label: "0", max: 0 },
    { label: "1–24", max: 24 },
    { label: "25–49", max: 49 },
    { label: "50–74", max: 74 },
    { label: "75–99", max: 99 },
    { label: "100+", max: Infinity },
  ].map((bin) => ({ ...bin, value: 0 }));
  const activityBins = ["0", "1", "2", "3", "4", "5", "6+"].map((label) => ({
    label,
    value: 0,
  }));

  for (const student of students) {
    const name = student.department || "Not specified";
    const entry = departments.get(name) ?? {
      department: name,
      students: 0,
      complete: 0,
      incomplete: 0,
      reachedTarget: 0,
      activities: 0,
      totalPoints: 0,
      avgPoints: 0,
      avgActivities: 0,
    };
    entry.students += 1;
    entry.complete += student.isComplete ? 1 : 0;
    entry.incomplete += student.isComplete ? 0 : 1;
    entry.reachedTarget += student.computedPoints >= POINTS_TARGET ? 1 : 0;
    entry.activities += student.activityCount;
    entry.totalPoints += student.computedPoints;
    departments.set(name, entry);

    for (const label of new Set(student.missingFields.map(missingFieldLabel))) {
      missing.set(label, (missing.get(label) ?? 0) + 1);
    }

    pointBins.find((bin) => student.computedPoints <= bin.max)!.value += 1;
    activityBins[Math.min(student.activityCount, 6)].value += 1;
  }

  for (const entry of departments.values()) {
    entry.avgPoints = average(entry.totalPoints, entry.students);
    entry.avgActivities = average(entry.activities, entry.students);
  }

  const points = students.reduce((sum, s) => sum + s.computedPoints, 0);
  const hours = students.reduce((sum, s) => sum + s.totalHours, 0);
  const activityTotal = students.reduce((sum, s) => sum + s.activityCount, 0);
  const withActivities = students.filter((s) => s.activityCount > 0).length;
  const reachedTarget = students.filter(
    (s) => s.computedPoints >= POINTS_TARGET
  ).length;
  const completeForms = students.filter((s) => s.isComplete).length;
  const withForms = new Set(students.map((s) => s.userId));

  const recency = [
    { label: "Last 24 hours", days: 1 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Over 30 days ago", days: Infinity },
  ].map((bucket) => ({ ...bucket, value: 0 }));
  let neverSignedIn = 0;

  for (const user of authUsers) {
    const ms = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : NaN;
    if (!Number.isFinite(ms)) {
      neverSignedIn += 1;
      continue;
    }
    recency.find((bucket) => nowMs - ms <= bucket.days * DAY_MS)!.value += 1;
  }

  const formEdits: { date: string; value: number }[] = [];
  const editsByDay = new Map<string, number>();
  for (const student of students) {
    const key = dayKey(student.updatedAt);
    if (key) editsByDay.set(key, (editsByDay.get(key) ?? 0) + 1);
  }
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = utcToKey(keyToUtc(today) - offset * DAY_MS);
    formEdits.push({ date, value: editsByDay.get(date) ?? 0 });
  }

  const userDays = authUsers.map((user) => dayKey(user.created_at));
  const formDays = students.map((student) => dayKey(student.createdAt));

  const byPoints = [...students].sort(
    (a, b) => b.computedPoints - a.computedPoints || a.name.localeCompare(b.name)
  );
  const byUpdated = [...students].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  return {
    generatedAt: now.toISOString(),
    totals: {
      registeredUsers: authUsers.length,
      confirmedUsers: authUsers.filter((user) => user.email_confirmed_at).length,
      studentsWithForms: students.length,
      usersWithoutForms: authUsers.filter((user) => !withForms.has(user.id)).length,
      withActivities,
      completeForms,
      reachedTarget,
      activities: activityTotal,
      hours,
      points,
      assets: students.reduce((sum, s) => sum + s.assetCount, 0),
      avgPoints: average(points, students.length),
      medianPoints: median(students.map((s) => s.computedPoints)),
      avgActivities: average(activityTotal, students.length),
      avgHoursPerActivity: average(hours, activityTotal),
      avgPointsPerActivity: average(points, activityTotal),
      activeLast7Days: authUsers.filter((user) => within(user.last_sign_in_at, 7))
        .length,
      newUsersLast7Days: authUsers.filter((user) => within(user.created_at, 7)).length,
      formsEditedLast7Days: students.filter((s) => within(s.updatedAt, 7)).length,
    },
    funnel: [
      { label: "Signed up", value: authUsers.length },
      { label: "Started a form", value: students.length },
      { label: "Added an activity", value: withActivities },
      { label: `Reached ${POINTS_TARGET} points`, value: reachedTarget },
      { label: "Form complete", value: completeForms },
    ],
    growth: buildGrowth(userDays, formDays, today),
    dailySignups: buildDailySignups(userDays, formDays, today),
    formEdits,
    pointsDistribution: pointBins.map(({ label, value }) => ({ label, value })),
    activityCountDistribution: activityBins,
    semesters: Array.from(semesters.values()).filter(
      (entry) => entry.activities > 0 || entry.label !== "Unspecified"
    ),
    categories: Array.from(categories.values())
      .map(({ owners, ...entry }) => ({ ...entry, students: owners.size }))
      .sort((a, b) => b.activities - a.activities || a.label.localeCompare(b.label)),
    activityMonths: buildMonths(months),
    places: tally(places, 10),
    commonActivities: tally(activityNames, 10),
    departments: Array.from(departments.values()).sort(
      (a, b) => b.students - a.students || a.department.localeCompare(b.department)
    ),
    periods: tally(students.map((s) => s.period || "Not specified")),
    signInRecency: [
      ...recency.map(({ label, value }) => ({ label, value })),
      { label: "Never signed in", value: neverSignedIn },
    ],
    missingFields: Array.from(missing, ([label, value]) => ({ label, value })).sort(
      (a, b) => b.value - a.value || a.label.localeCompare(b.label)
    ),
    evidence,
    topStudents: byPoints.slice(0, 10).map(studentRef),
    recentlyUpdated: byUpdated.slice(0, 8).map(studentRef),
    accountsWithoutForms: authUsers
      .filter((user) => !withForms.has(user.id))
      .map((user) => ({
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? "",
        lastSignInAt: user.last_sign_in_at ?? "",
        confirmed: Boolean(user.email_confirmed_at),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    agents: agentTokens && {
      tokens: agentTokens.length,
      usersWithTokens: new Set(agentTokens.map((token) => token.user_id)).size,
      usersWhoUsedOne: new Set(
        agentTokens.filter((token) => token.last_used_at).map((token) => token.user_id)
      ).size,
      usedLast7Days: new Set(
        agentTokens
          .filter((token) => within(token.last_used_at, 7))
          .map((token) => token.user_id)
      ).size,
    },
  };
}

/** Where one student sits among everyone with a form. */
export interface CohortPosition {
  cohortSize: number;
  /** 1 is the highest points total; ties share a rank. */
  rank: number;
  cohortAvgPoints: number;
  cohortMedianPoints: number;
  departmentSize: number;
  departmentAvgPoints: number;
}

export function cohortPositionFor(
  student: StudentSummary,
  students: StudentSummary[]
): CohortPosition {
  const peers = students.filter((s) => s.department === student.department);
  const sum = (list: StudentSummary[]) =>
    list.reduce((total, s) => total + s.computedPoints, 0);

  return {
    cohortSize: students.length,
    rank: students.filter((s) => s.computedPoints > student.computedPoints).length + 1,
    cohortAvgPoints: average(sum(students), students.length),
    cohortMedianPoints: median(students.map((s) => s.computedPoints)),
    departmentSize: peers.length,
    departmentAvgPoints: average(sum(peers), peers.length),
  };
}
