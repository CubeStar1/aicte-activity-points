/**
 * Shared, dependency-free helpers for aggregating `activity_forms` rows into
 * per-student summaries. Consumed by both the admin dashboard (through the
 * `.d.mts` declarations) and `scripts/export-data.mjs`, so it stays plain ESM
 * with no imports.
 */

const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

/** @param {unknown} value */
function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** @param {unknown} value */
function num(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** @param {unknown} value */
function arr(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Turn a USN (or the user id, as fallback) into a filesystem-safe folder name.
 * @param {string} usn
 * @param {string} userId
 */
export function folderNameFor(usn, userId) {
  const cleaned = str(usn)
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "_")
    .replace(/^[._]+|[._]+$/g, "");

  if (!cleaned || WINDOWS_RESERVED.test(cleaned)) {
    return str(userId) || "unknown-user";
  }
  return cleaned;
}

/**
 * Every uploaded asset a form references, tagged with the activity it belongs to.
 * @param {any} formData
 */
export function collectAssets(formData) {
  /** @type {any[]} */
  const assets = [];

  arr(formData?.activities).forEach((activity, activityIndex) => {
    const slNo = num(activity?.slNo) || activityIndex + 1;
    const activityName = str(activity?.name);

    const certificate = str(activity?.certificateImage);
    if (certificate) {
      assets.push({
        url: certificate,
        kind: "certificate",
        activityIndex,
        slNo,
        activityName,
        photoIndex: null,
      });
    }

    arr(activity?.photos).forEach((photo, photoIndex) => {
      const url = str(photo);
      if (!url) return;
      assets.push({
        url,
        kind: "photo",
        activityIndex,
        slNo,
        activityName,
        photoIndex,
      });
    });
  });

  return assets;
}

/**
 * Fields a form needs before it is worth submitting. Used to flag incomplete
 * records on the dashboard, not to block anything.
 * @param {any} formData
 */
export function missingFieldsFor(formData) {
  /** @type {string[]} */
  const missing = [];
  const student = formData?.student ?? {};

  if (!str(student.name)) missing.push("student.name");
  if (!str(student.usn)) missing.push("student.usn");
  if (!str(student.department)) missing.push("student.department");

  const activities = arr(formData?.activities);
  if (activities.length === 0) missing.push("activities");

  activities.forEach((activity, index) => {
    const label = `activity[${index + 1}]`;
    if (!str(activity?.name)) missing.push(`${label}.name`);
    if (!str(activity?.semester)) missing.push(`${label}.semester`);
    if (!str(activity?.aicteMapping)) missing.push(`${label}.aicteMapping`);
    if (!str(activity?.certificateImage)) missing.push(`${label}.certificate`);
  });

  const signatories = formData?.signatories ?? {};
  if (!str(signatories?.counsellor?.name)) missing.push("signatories.counsellor");
  if (!str(signatories?.evaluator1?.name)) missing.push("signatories.evaluator1");
  if (!str(signatories?.evaluator2?.name)) missing.push("signatories.evaluator2");

  return missing;
}

/**
 * Collapse one `activity_forms` row (plus its auth user, when available) into a
 * flat summary suitable for a table row, a CSV line or a JSON manifest.
 * @param {any} row
 * @param {any} [authUser]
 */
export function summarizeStudent(row, authUser) {
  const formData = row?.form_data ?? null;
  const student = formData?.student ?? {};
  const activities = arr(formData?.activities);
  const assets = collectAssets(formData);
  const missingFields = missingFieldsFor(formData);

  const semesters = Array.from(
    new Set(activities.map((a) => str(a?.semester)).filter(Boolean))
  ).sort((a, b) => num(a) - num(b));

  const aicteCategories = Array.from(
    new Set(activities.map((a) => str(a?.aicteMapping)).filter(Boolean))
  );

  const activityDates = activities
    .flatMap((a) => [str(a?.startDate), str(a?.endDate)])
    .filter(Boolean)
    .sort();

  const usn = str(student.usn);
  const userId = str(row?.user_id);

  return {
    userId,
    formId: str(row?.id),
    folderName: folderNameFor(usn, userId),

    email: str(authUser?.email) || null,
    name: str(student.name),
    usn,
    department: str(student.department),
    period: str(student.period),

    declaredPoints: num(student.totalPoints),
    computedPoints: activities.reduce((sum, a) => sum + num(a?.pointsEarned), 0),
    totalHours: activities.reduce((sum, a) => sum + num(a?.hoursSpent), 0),
    totalDurationDays: activities.reduce((sum, a) => sum + num(a?.duration), 0),

    activityCount: activities.length,
    certificateAttachedCount: activities.filter(
      (a) => a?.certificateAttached === true
    ).length,
    certificateImageCount: assets.filter((a) => a.kind === "certificate").length,
    photoCount: assets.filter((a) => a.kind === "photo").length,
    assetCount: assets.length,
    evaluationCount: arr(formData?.evaluations).length,

    semesters,
    aicteCategories,
    firstActivityDate: activityDates[0] ?? "",
    lastActivityDate: activityDates[activityDates.length - 1] ?? "",

    evaluator1: str(formData?.signatories?.evaluator1?.name),
    evaluator2: str(formData?.signatories?.evaluator2?.name),
    counsellor: str(formData?.signatories?.counsellor?.name),

    missingFields,
    isComplete: missingFields.length === 0,

    createdAt: str(row?.created_at),
    updatedAt: str(row?.updated_at),
    signedUpAt: str(authUser?.created_at),
    lastSignInAt: str(authUser?.last_sign_in_at),
    emailConfirmedAt: str(authUser?.email_confirmed_at),
  };
}

/** Columns for the per-student master CSV, in order. */
export const STUDENT_COLUMNS = [
  { key: "usn", header: "USN" },
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "department", header: "Department" },
  { key: "period", header: "Period" },
  { key: "declaredPoints", header: "Declared Points" },
  { key: "computedPoints", header: "Computed Points" },
  { key: "activityCount", header: "Activities" },
  { key: "totalHours", header: "Total Hours" },
  { key: "totalDurationDays", header: "Total Duration (days)" },
  { key: "certificateAttachedCount", header: "Certificates Marked" },
  { key: "certificateImageCount", header: "Certificate Files" },
  { key: "photoCount", header: "Photos" },
  { key: "assetCount", header: "Total Assets" },
  { key: "evaluationCount", header: "Evaluation Rows" },
  { key: "semesters", header: "Semesters" },
  { key: "firstActivityDate", header: "First Activity" },
  { key: "lastActivityDate", header: "Last Activity" },
  { key: "counsellor", header: "Counsellor" },
  { key: "evaluator1", header: "Evaluator 1" },
  { key: "evaluator2", header: "Evaluator 2" },
  { key: "isComplete", header: "Complete" },
  { key: "missingFields", header: "Missing Fields" },
  { key: "folderName", header: "Folder" },
  { key: "userId", header: "User ID" },
  { key: "createdAt", header: "Created At" },
  { key: "updatedAt", header: "Updated At" },
  { key: "lastSignInAt", header: "Last Sign In" },
];

/** Columns for the per-activity CSV, in order. */
export const ACTIVITY_COLUMNS = [
  { key: "usn", header: "USN" },
  { key: "studentName", header: "Student Name" },
  { key: "department", header: "Department" },
  { key: "slNo", header: "Sl No" },
  { key: "semester", header: "Semester" },
  { key: "name", header: "Activity" },
  { key: "aicteMapping", header: "AICTE Mapping" },
  { key: "startDate", header: "Start Date" },
  { key: "endDate", header: "End Date" },
  { key: "duration", header: "Duration (days)" },
  { key: "place", header: "Place" },
  { key: "hoursSpent", header: "Hours" },
  { key: "pointsEarned", header: "Points" },
  { key: "certificateAttached", header: "Certificate Attached" },
  { key: "certificateImage", header: "Certificate URL" },
  { key: "photoCount", header: "Photo Count" },
  { key: "photos", header: "Photo URLs" },
  { key: "detailedReportPageNo", header: "Report Page No" },
  { key: "outcomes", header: "Outcomes" },
  { key: "description", header: "Description" },
  { key: "userId", header: "User ID" },
];

/**
 * One row per activity, for the activities CSV.
 * @param {any} summary
 * @param {any} formData
 */
export function activityRowsFor(summary, formData) {
  return arr(formData?.activities).map((activity, index) => ({
    usn: summary.usn,
    studentName: summary.name,
    department: summary.department,
    userId: summary.userId,
    slNo: num(activity?.slNo) || index + 1,
    semester: str(activity?.semester),
    name: str(activity?.name),
    aicteMapping: str(activity?.aicteMapping),
    startDate: str(activity?.startDate),
    endDate: str(activity?.endDate),
    duration: num(activity?.duration),
    place: str(activity?.place),
    hoursSpent: num(activity?.hoursSpent),
    pointsEarned: num(activity?.pointsEarned),
    certificateAttached: activity?.certificateAttached === true,
    certificateImage: str(activity?.certificateImage),
    photoCount: arr(activity?.photos).length,
    photos: arr(activity?.photos).filter(Boolean),
    detailedReportPageNo: str(activity?.detailedReportPageNo),
    outcomes: str(activity?.outcomes),
    description: str(activity?.description),
  }));
}

/**
 * Render a single CSV cell: arrays are joined, and text a spreadsheet would
 * otherwise evaluate as a formula gets an apostrophe in front.
 * @param {unknown} value
 */
function csvCell(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);

  const text = String(value);
  return /^[=+@\t\r]/.test(text) ? `'${text}` : text;
}

/**
 * @param {readonly any[]} rows
 * @param {readonly {key: string, header: string}[]} columns
 */
export function toCsv(rows, columns) {
  const escape = (/** @type {string} */ cell) =>
    /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;

  const lines = [columns.map((column) => escape(column.header)).join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => escape(csvCell(row[column.key]))).join(","));
  }

  // The BOM keeps Excel from mangling non-ASCII names.
  return `﻿${lines.join("\r\n")}\r\n`;
}
