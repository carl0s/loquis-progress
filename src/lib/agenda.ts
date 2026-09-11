import { daysBetween } from "./dates";
import type { RawEvent } from "./calendar";
import type { AgendaItem, Project, Relation } from "./types";

export type EventLinks = Record<string, { projectId: string | null; ignored: boolean }>;

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Attach each calendar occurrence to projects (manual link by event UID first, then keywords)
 * and to nearby open deliverables. Unmatched events only relate to a deadline 0-2 days away.
 */
export function buildAgenda(events: RawEvent[], projects: Project[], links: EventLinks): AgendaItem[] {
  const known = new Set(projects.map((p) => p.id));
  const dated = projects.filter((p) => !p.ongoing);

  return events.map((ev) => {
    const link = links[ev.uid];
    let projectIds: string[] = [];
    let source: AgendaItem["source"] = "none";

    if (link && !link.ignored && link.projectId && known.has(link.projectId)) {
      projectIds = [link.projectId];
      source = "manual";
    } else if (!link) {
      const haystack = fold(`${ev.title} ${ev.location} ${ev.description}`);
      projectIds = projects
        .filter((p) => p.keywords.some((k) => k.trim() !== "" && haystack.includes(fold(k.trim()))))
        .map((p) => p.id);
      if (projectIds.length > 0) source = "keyword";
    }

    const matched = projectIds.length > 0;
    const pool = matched ? dated.filter((p) => projectIds.includes(p.id)) : dated;
    const relations: Relation[] = [];

    for (const p of pool) {
      for (const d of p.deliverables) {
        if (d.status === "done") continue;
        const toDue = daysBetween(ev.date, d.dueDate);
        let kind: Relation["kind"] | null = null;
        if (toDue === 0) kind = "same";
        else if (toDue > 0 && d.startDate && ev.date >= d.startDate) kind = matched ? "during" : null;
        else if (toDue > 0 && toDue <= (matched ? 7 : 2)) kind = "before";
        else if (toDue < 0 && toDue >= -3 && matched) kind = "after";
        if (kind) {
          relations.push({ deliverableId: d.id, projectId: p.id, code: p.code, title: d.title, kind, days: Math.abs(toDue) });
        }
      }
    }
    relations.sort((a, b) => a.days - b.days);

    return {
      key: ev.key,
      uid: ev.uid,
      title: ev.title,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      allDay: ev.allDay,
      location: ev.location,
      projectIds,
      source,
      ignored: Boolean(link?.ignored),
      relations: relations.slice(0, 2),
    };
  });
}

export const isRelevant = (item: AgendaItem) => !item.ignored && (item.projectIds.length > 0 || item.relations.length > 0);
