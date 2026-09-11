// Listino progetti addizionali: partecipazione a bandi e candidature.
export const RATE_HOUR = 53.13;
export const RATE_DAY = 425;
export const DAY_HOURS = 8;
export const MONTH_CAP_DAYS = 4;
export const MONTH_CAP_MINUTES = MONTH_CAP_DAYS * DAY_HOURS * 60;

/** Fractions of an hour are rounded up to the next half hour (applied per entry). */
export const billable = (minutes: number) => Math.ceil(minutes / 30) * 30;

/** Full 8-hour days are billed at the day rate, the remainder at the hourly rate. */
export function amount(billedMinutes: number) {
  const hours = billedMinutes / 60;
  const days = Math.floor(hours / DAY_HOURS);
  const rest = hours - days * DAY_HOURS;
  return Math.round((days * RATE_DAY + rest * RATE_HOUR) * 100) / 100;
}

/** Accepts "1:30", "1,5", "1.5", "1h30", "2h", "45m". Returns minutes. */
export function parseDuration(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  let m = s.match(/^(\d{1,2}):([0-5]\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = s.match(/^(\d{1,2})h(\d{1,2})?(?:m|min)?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);
  m = s.match(/^(\d{1,4})(?:m|min)$/);
  if (m) return Number(m[1]);
  m = s.match(/^(\d{1,2}(?:[.,]\d{1,2})?)$/);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 60);
  return null;
}

const hoursFmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
/** "1,5" */
export const fmtHourValue = (minutes: number) => hoursFmt.format(minutes / 60);
/** "1,5 h" */
export const fmtHours = (minutes: number) => `${fmtHourValue(minutes)} h`;
/** "1 h 20 min" */
export function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  return h ? `${h} h` : `${m} min`;
}
export const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
