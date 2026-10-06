import type { Activity, FormFillerData } from "../types/form-filler";

export interface ActivityFormRow {
  id: string;
  user_id: string;
  form_data: FormFillerData | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUserLite {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}

export type AssetKind = "certificate" | "photo";

export interface FormAsset {
  url: string;
  kind: AssetKind;
  activityIndex: number;
  slNo: number;
  activityName: string;
  photoIndex: number | null;
}

export interface StudentSummary {
  userId: string;
  formId: string;
  folderName: string;

  email: string | null;
  name: string;
  usn: string;
  department: string;
  period: string;

  declaredPoints: number;
  computedPoints: number;
  totalHours: number;
  totalDurationDays: number;

  activityCount: number;
  certificateAttachedCount: number;
  certificateImageCount: number;
  photoCount: number;
  assetCount: number;
  evaluationCount: number;

  semesters: string[];
  aicteCategories: string[];
  firstActivityDate: string;
  lastActivityDate: string;

  evaluator1: string;
  evaluator2: string;
  counsellor: string;

  missingFields: string[];
  isComplete: boolean;

  createdAt: string;
  updatedAt: string;
  signedUpAt: string;
  lastSignInAt: string;
  emailConfirmedAt: string;
}

export interface ActivityRow
  extends Pick<
    Activity,
    | "semester"
    | "name"
    | "aicteMapping"
    | "startDate"
    | "endDate"
    | "duration"
    | "place"
    | "hoursSpent"
    | "pointsEarned"
    | "certificateAttached"
    | "detailedReportPageNo"
    | "outcomes"
    | "description"
  > {
  usn: string;
  studentName: string;
  department: string;
  userId: string;
  slNo: number;
  certificateImage: string;
  photoCount: number;
  photos: string[];
}

export interface CsvColumn {
  key: string;
  header: string;
}

export function folderNameFor(usn: string, userId: string): string;
export function collectAssets(formData: FormFillerData | null | undefined): FormAsset[];
export function missingFieldsFor(formData: FormFillerData | null | undefined): string[];
export function summarizeStudent(
  row: ActivityFormRow,
  authUser?: AuthUserLite | null
): StudentSummary;
export function activityRowsFor(
  summary: StudentSummary,
  formData: FormFillerData | null | undefined
): ActivityRow[];
export function toCsv(rows: readonly any[], columns: readonly CsvColumn[]): string;

export const STUDENT_COLUMNS: readonly CsvColumn[];
export const ACTIVITY_COLUMNS: readonly CsvColumn[];
