import ICAL from "ical.js";
import { addDays, isoInRome, timeInRome } from "./dates";

// Reads the calendar through its secret iCal address (Google Calendar: Impostazioni >
// Integra calendario > Indirizzo segreto in formato iCal). The embed link only works
// inside a logged-in browser, so it cannot be used from the server.

export type RawEvent = {
  key: string;
  uid: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string;
  description: string;
};

type CacheEntry = { at: number; text: string };
const TTL = 10 * 60_000;
const store = globalThis as typeof globalThis & { __loquisIcs?: Map<string, CacheEntry> };
const cache = (store.__loquisIcs ??= new Map());

export const clearCalendarCache = () => cache.clear();

export const normalizeIcsUrl = (raw: string) => raw.trim().replace(/^webcal:\/\//i, "https://");

/** Returns a user-facing problem, or null when the address looks usable. */
export function checkIcsUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(normalizeIcsUrl(raw));
  } catch {
    return "Non è un indirizzo valido.";
  }
  if (url.protocol !== "https:") return "L'indirizzo deve iniziare con https:// o webcal://.";
  if (url.pathname.includes("/calendar/embed")) {
    return "Questo è il link di incorporamento: funziona solo nel browser in cui sei loggato. Serve l'indirizzo segreto in formato iCal, quello che termina con .ics.";
  }
  return null;
}

export async function loadCalendar(
  url: string,
  range: { from: string; to: string },
  force = false,
): Promise<{ ok: true; events: RawEvent[]; fetchedAt: number } | { ok: false; message: string }> {
  const target = normalizeIcsUrl(url);
  let entry = cache.get(target);

  if (force || !entry || Date.now() - entry.at > TTL) {
    let response: Response;
    try {
      response = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    } catch {
      return { ok: false, message: "Il calendario non risponde. Riprova tra poco." };
    }
    if ([401, 403, 404].includes(response.status)) {
      return {
        ok: false,
        message: `Google ha risposto ${response.status}: l'indirizzo non è pubblico oppure non è quello segreto. Copia di nuovo l'indirizzo segreto in formato iCal.`,
      };
    }
    if (!response.ok) return { ok: false, message: `Il calendario ha risposto con errore ${response.status}.` };
    const text = await response.text();
    if (!text.includes("BEGIN:VCALENDAR")) return { ok: false, message: "L'indirizzo non restituisce un file iCal." };
    entry = { at: Date.now(), text };
    cache.set(target, entry);
  }

  try {
    return { ok: true, events: expand(entry.text, range), fetchedAt: entry.at };
  } catch {
    return { ok: false, message: "Il file iCal non è leggibile." };
  }
}

function describe(time: ICAL.Time) {
  if (time.isDate) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return { date: `${time.year}-${pad(time.month)}-${pad(time.day)}`, time: null };
  }
  const js = time.toJSDate();
  return { date: isoInRome(js), time: timeInRome(js) };
}

const prop = (component: ICAL.Component, name: string) => String(component.getFirstPropertyValue(name) ?? "");

function expand(text: string, range: { from: string; to: string }): RawEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  const masters: ICAL.Component[] = [];
  const exceptions = new Map<string, ICAL.Component[]>();
  for (const vevent of root.getAllSubcomponents("vevent")) {
    if (vevent.hasProperty("recurrence-id")) {
      const uid = prop(vevent, "uid");
      exceptions.set(uid, [...(exceptions.get(uid) ?? []), vevent]);
    } else {
      masters.push(vevent);
    }
  }

  // Generous bounds in real time; the exact filter happens on the Rome-local date.
  const lower = new Date(`${addDays(range.from, -1)}T00:00:00Z`);
  const upper = new Date(`${addDays(range.to, 2)}T00:00:00Z`);
  const out: RawEvent[] = [];

  const push = (event: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null, key: string) => {
    if (prop(event.component, "status").toUpperCase() === "CANCELLED") return;
    const s = describe(start);
    if (s.date < range.from || s.date > range.to) return;
    out.push({
      key,
      uid: event.uid,
      title: (event.summary ?? "").trim() || "Occupato",
      date: s.date,
      startTime: s.time,
      endTime: end && !end.isDate ? describe(end).time : null,
      allDay: start.isDate,
      location: (event.location ?? "").trim(),
      description: (event.description ?? "").slice(0, 2000),
    });
  };

  for (const master of masters) {
    const event = new ICAL.Event(master);
    const related = exceptions.get(event.uid) ?? [];
    exceptions.delete(event.uid);
    for (const exception of related) event.relateException(exception);

    if (!event.isRecurring()) {
      push(event, event.startDate, event.endDate, event.uid);
      continue;
    }

    const iterator = event.iterator();
    let guard = 0;
    for (let next = iterator.next(); next && guard < 20_000; next = iterator.next(), guard++) {
      if (next.toJSDate() > upper) break;
      const occurrence = event.getOccurrenceDetails(next);
      if (occurrence.endDate.toJSDate() < lower) continue;
      push(occurrence.item, occurrence.startDate, occurrence.endDate, `${event.uid}|${next.toString()}`);
    }
  }

  // Single instances whose series is not in the feed (e.g. one occurrence of someone else's series).
  for (const list of exceptions.values()) {
    for (const component of list) {
      const event = new ICAL.Event(component);
      push(event, event.startDate, event.endDate, `${event.uid}|${prop(component, "recurrence-id")}`);
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}
