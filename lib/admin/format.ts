/**
 * Date and number formatting for the admin dashboard. Locale and timezone are
 * fixed so the server render and the browser agree on every string.
 */

const LOCALE = "en-IN";
const TIME_ZONE = "Asia/Kolkata";
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A timestamp as `06 Oct 2026`. */
export function formatDate(value: string | null | undefined, fallback = "—") {
  const date = parse(value);
  return date ? dateFormat.format(date) : fallback;
}

/** A timestamp as `06 Oct 2026, 14:05`. */
export function formatDateTime(value: string | null | undefined, fallback = "—") {
  const date = parse(value);
  return date ? dateTimeFormat.format(date) : fallback;
}

/** A `YYYY-MM-DD` key as `6 Oct`, with the year when asked. */
export function formatDayKey(key: string, withYear = false) {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return `${day} ${MONTHS[month - 1]}${withYear ? ` ${year}` : ""}`;
}

/** A `YYYY-MM` key as `Oct 2026`. */
export function formatMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatNumber(value: number) {
  return numberFormat.format(value);
}

/** `part` of `whole` as a whole-number percentage, `0%` when there is no whole. */
export function formatPercent(part: number, whole: number) {
  return `${whole ? Math.round((part / whole) * 100) : 0}%`;
}
