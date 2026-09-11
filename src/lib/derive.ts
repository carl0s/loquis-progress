import { daysBetween, firstOfMonth, fmtDay, fmtRelative, monthKey, nextMonth, plural } from "./dates";
import type { Blocker, Deliverable, Project, Relation } from "./types";

/** Vermilion is reserved for "late" and "today". */
export type Tone = "late" | "today" | "normal" | "done";

export const isLate = (d: Deliverable, today: string) => d.status !== "done" && d.dueDate < today;

export const blockerDays = (b: Blocker, today: string) => Math.max(0, daysBetween(b.openedOn, b.resolvedOn ?? today));

export const waitingSince = (days: number) => (days === 0 ? "da oggi" : `da ${plural(days, "giorno", "giorni")}`);

/** The contract repeats "Prima iterazione" on every first-round item; compact views drop it. */
export const shortTitle = (title: string) => title.replace(/^Prima iterazione\s+/i, "");

export function dueState(d: Deliverable, today: string): { text: string; tone: Tone } {
  if (d.status === "done") return { text: `consegnata il ${fmtDay(d.doneOn ?? d.dueDate)}`, tone: "done" };
  const toDue = daysBetween(today, d.dueDate);
  if (toDue < 0) return { text: `scaduta da ${plural(-toDue, "giorno", "giorni")}`, tone: "late" };
  if (d.startDate && today < d.startDate) {
    return { text: `inizia ${fmtRelative(daysBetween(today, d.startDate))}`, tone: "normal" };
  }
  if (d.startDate) {
    return toDue === 0 ? { text: "termina oggi", tone: "today" } : { text: `termina ${fmtRelative(toDue)}`, tone: "normal" };
  }
  return toDue === 0 ? { text: "scade oggi", tone: "today" } : { text: fmtRelative(toDue), tone: "normal" };
}

export function relationText(r: Relation) {
  const what = `${r.code} ${shortTitle(r.title)}`;
  if (r.kind === "same") return `Stesso giorno della scadenza: ${what}`;
  if (r.kind === "during") return `Durante il periodo: ${what}`;
  if (r.kind === "before") return `${plural(r.days, "giorno", "giorni")} prima di: ${what}`;
  return `${plural(r.days, "giorno", "giorni")} dopo la scadenza di: ${what}`;
}

export type Item = { p: Project; d: Deliverable };

export const datedItems = (projects: Project[]): Item[] =>
  projects.filter((p) => !p.ongoing).flatMap((p) => p.deliverables.map((d) => ({ p, d })));

export function upcoming(projects: Project[], today: string, limit = 4): Item[] {
  return datedItems(projects)
    .filter(({ d }) => d.status !== "done" && d.dueDate >= today)
    .sort((a, b) => a.d.dueDate.localeCompare(b.d.dueDate))
    .slice(0, limit);
}

export const overdue = (projects: Project[], today: string): Item[] =>
  datedItems(projects).filter(({ d }) => isLate(d, today));

export const blockerRows = (projects: Project[]) =>
  datedItems(projects).flatMap(({ p, d }) => d.blockers.map((b) => ({ p, d, b })));

/** "2026-08" ... through the last deadline (or the current month, if later). */
export function contractMonths(projects: Project[], today: string): string[] {
  const dates = [today, ...datedItems(projects).flatMap(({ d }) => [d.startDate ?? d.dueDate, d.dueDate])];
  const first = dates.reduce((a, b) => (a < b ? a : b));
  const last = dates.reduce((a, b) => (a > b ? a : b));
  const end = [monthKey(last), monthKey(today)].reduce((a, b) => (a > b ? a : b));
  const months: string[] = [];
  for (let m = firstOfMonth(first); monthKey(m) <= end; m = nextMonth(m)) months.push(monthKey(m));
  return months;
}
