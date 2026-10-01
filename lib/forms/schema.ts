import { z } from "zod";
import {
  AICTE_CATEGORIES,
  DEPARTMENTS,
  SEMESTERS,
} from "@/lib/types/form-filler";

// Input schemas for writes that don't come from the web form (the MCP server).

export const MAX_ACTIVITIES = 100;
export const MAX_PHOTOS_PER_ACTIVITY = 20;

const shortText = z.string().trim().max(300);
const longText = z.string().trim().max(5000);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Not a real date");

export const studentInfoSchema = z.object({
  name: shortText.optional().describe("Student's full name"),
  usn: shortText.optional().describe("University seat number, e.g. 1RV22CS001"),
  department: z.enum(DEPARTMENTS).optional(),
  period: shortText.optional().describe("Programme period, e.g. 2022-2026"),
});

const signatorySchema = z.object({
  name: shortText.optional(),
  designation: shortText.optional(),
});

export const signatoriesSchema = z.object({
  evaluator1: signatorySchema.optional(),
  evaluator2: signatorySchema.optional(),
  counsellor: signatorySchema.optional(),
});

export const activityFieldsSchema = z.object({
  name: shortText.optional().describe("Activity name, e.g. Blood Donation Camp"),
  semester: z.enum(SEMESTERS).optional().describe("Semester the activity was done in"),
  aicteMapping: shortText
    .optional()
    .describe(
      `AICTE category. Use one of the standard categories verbatim where one fits, otherwise a custom category. Standard categories: ${AICTE_CATEGORIES.map(
        (category, idx) => `(${idx + 1}) ${category}`
      ).join("; ")}`
    ),
  startDate: isoDate.optional().describe("YYYY-MM-DD"),
  endDate: isoDate.optional().describe("YYYY-MM-DD, on or after startDate"),
  place: shortText.optional().describe("Where it took place, e.g. RVCE Campus"),
  hoursSpent: z.number().min(0).max(10000).optional(),
  pointsEarned: z.number().min(0).max(1000).optional(),
  detailedReportPageNo: shortText
    .optional()
    .describe("Page range of this activity's detailed report in the PDF, e.g. 1-2"),
  certificateAttached: z
    .boolean()
    .optional()
    .describe("Whether a certificate is available for this activity"),
  description: longText.optional().describe("What the activity involved"),
  outcomes: longText.optional().describe("What the student learned or achieved"),
});

export type ActivityFields = z.infer<typeof activityFieldsSchema>;
