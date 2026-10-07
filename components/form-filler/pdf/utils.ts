import { Activity } from "@/lib/types/form-filler";
import { format, parseISO } from "date-fns";

export const formatDateRange = (activity: Activity) => {
  if (!activity.startDate || !activity.endDate) return "";
  try {
    const start = format(parseISO(activity.startDate), "dd-MM-yy");
    const end = format(parseISO(activity.endDate), "dd-MM-yy");
    const days = activity.duration || 0;
    return `${start} to ${end}, ${days} day${days > 1 ? "s" : ""}`;
  } catch (e) {
    return "";
  }
};
