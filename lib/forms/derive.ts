import { differenceInDays, format, parseISO } from "date-fns";
import {
  Activity,
  EvaluationEntry,
  FormFillerData,
} from "@/lib/types/form-filler";

// Shared by the web form and the MCP server, so both produce the same report.

export const emptyFormData = (): FormFillerData => ({
  student: {
    name: "",
    usn: "",
    department: "",
    period: "2022-2026",
    totalPoints: 0,
  },
  activities: [],
  evaluations: [],
  signatories: {
    evaluator1: { name: "", designation: "" },
    evaluator2: { name: "", designation: "" },
    counsellor: { name: "", designation: "" },
  },
});

export const totalPoints = (activities: Activity[]) =>
  activities.reduce((sum, act) => sum + (act.pointsEarned || 0), 0);

/** Inclusive day count, or 0 if either date is missing or invalid. */
export const durationDays = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 0;
  const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  return Number.isFinite(days) ? days : 0;
};

export const buildEvaluations = (data: FormFillerData): EvaluationEntry[] =>
  data.activities.map((act, idx) => {
    let durationStr = "";
    if (act.startDate && act.endDate) {
      try {
        const start = parseISO(act.startDate);
        const end = parseISO(act.endDate);
        const days = differenceInDays(end, start) + 1;
        durationStr = `${format(start, "dd-MM-yy")} to ${format(
          end,
          "dd-MM-yy"
        )}, ${days} day${days > 1 ? "s" : ""}`;
      } catch (e) {
        console.error("Date parsing error", e);
      }
    }

    return {
      slNo: idx + 1,
      nameOfStudent: data.student.name,
      usn: data.student.usn,
      typeOfWork: act.name,
      duration: durationStr,
      hoursSpent: act.hoursSpent,
      certificateAvailable: act.certificateAttached,
      pointsEarned: act.pointsEarned,
    };
  });

/** The form with its total points and evaluation table recomputed. */
export const withDerived = (data: FormFillerData): FormFillerData => ({
  student: { ...data.student, totalPoints: totalPoints(data.activities) },
  activities: data.activities,
  evaluations: buildEvaluations(data),
  signatories: data.signatories,
});
