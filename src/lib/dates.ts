// All calendar dates are ISO "YYYY-MM-DD" strings interpreted as days in Europe/Rome.

const TZ = "Europe/Rome";
const DAY = 86_400_000;

const romeDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const romeTime = new Intl.DateTimeFormat("it-IT", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export const isoInRome = (d: Date) => romeDate.format(d);
export const timeInRome = (d: Date) => romeTime.format(d);
export const todayISO = () => isoInRome(new Date());

export function toUTC(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isValidISO(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = toUTC(s);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export const daysBetween = (from: string, to: string) => Math.round((toUTC(to) - toUTC(from)) / DAY);
export const addDays = (iso: string, n: number) => new Date(toUTC(iso) + n * DAY).toISOString().slice(0, 10);
export const firstOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;
export const monthKey = (iso: string) => iso.slice(0, 7);
export const weekday = (iso: string) => new Date(toUTC(iso)).getUTCDay();

export function nextMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o });
const fDay = fmt({ day: "numeric", month: "short" });
const fLong = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fWeekday = fmt({ weekday: "short", day: "numeric", month: "short" });
const fWeekdayOnly = fmt({ weekday: "short" });
const fMonthYear = fmt({ month: "long", year: "numeric" });
const fMonthName = fmt({ month: "long" });
const fMonthShort = fmt({ month: "short" });

/** "5 ago" */
export const fmtDay = (iso: string) => fDay.format(toUTC(iso));
/** "venerdì 11 settembre 2026" */
export const fmtLong = (iso: string) => fLong.format(toUTC(iso));
/** "ven 11 set" */
export const fmtWeekday = (iso: string) => fWeekday.format(toUTC(iso));
/** "ven" */
export const fmtWeekdayOnly = (iso: string) => fWeekdayOnly.format(toUTC(iso));
/** "10 set, 18:40" from a full ISO timestamp */
export const fmtStamp = (timestamp: string | number) => {
  const d = new Date(timestamp);
  return `${fmtDay(isoInRome(d))}, ${timeInRome(d)}`;
};
/** "settembre 2026" from "2026-09" */
export const fmtMonthYear = (key: string) => fMonthYear.format(toUTC(`${key}-01`));
/** "settembre" */
export const fmtMonthName = (iso: string) => fMonthName.format(toUTC(iso));
/** "set" */
export const fmtMonthShort = (iso: string) => fMonthShort.format(toUTC(iso));
export const dayOfMonth = (iso: string) => Number(iso.slice(8, 10));

export function fmtRelative(n: number) {
  if (n === 0) return "oggi";
  if (n === 1) return "domani";
  if (n === -1) return "ieri";
  return n > 0 ? `tra ${n} giorni` : `${-n} giorni fa`;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
