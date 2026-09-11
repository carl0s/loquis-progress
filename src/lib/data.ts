import { all, run } from "./db";
import type { EventLinks } from "./agenda";
import type { Blocker, Deliverable, HourEntry, LogEntry, LogKind, Note, Project, Status } from "./types";

type ProjectRow = {
  id: string;
  code: string;
  name: string;
  objective: string;
  criteria: string;
  keywords: string;
  ongoing: number;
};

type DeliverableRow = {
  id: number;
  project_id: string;
  title: string;
  contents: string;
  start_date: string | null;
  due_date: string;
  status: Status;
  contract_note: string;
  done_on: string | null;
};

type BlockerRow = {
  id: number;
  deliverable_id: number;
  party: string;
  reason: string;
  opened_on: string;
  resolved_on: string | null;
};

function parseList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function getProjects(): Promise<Project[]> {
  const [projects, deliverables, blockers, notes] = await Promise.all([
    all<ProjectRow>("SELECT * FROM projects ORDER BY sort"),
    all<DeliverableRow>("SELECT * FROM deliverables ORDER BY due_date, sort, id"),
    all<BlockerRow>("SELECT * FROM blockers ORDER BY opened_on, id"),
    all<{ id: number; deliverable_id: number; date: string; body: string; shared: number }>(
      "SELECT id, deliverable_id, date, body, shared FROM notes ORDER BY date DESC, id DESC",
    ),
  ]);

  const notesByDeliverable = new Map<number, Note[]>();
  for (const n of notes) {
    const list = notesByDeliverable.get(n.deliverable_id) ?? [];
    list.push({ id: n.id, deliverableId: n.deliverable_id, date: n.date, body: n.body, shared: Boolean(n.shared) });
    notesByDeliverable.set(n.deliverable_id, list);
  }

  const blockersByDeliverable = new Map<number, Blocker[]>();
  for (const b of blockers) {
    const list = blockersByDeliverable.get(b.deliverable_id) ?? [];
    list.push({
      id: b.id,
      deliverableId: b.deliverable_id,
      party: b.party,
      reason: b.reason,
      openedOn: b.opened_on,
      resolvedOn: b.resolved_on,
    });
    blockersByDeliverable.set(b.deliverable_id, list);
  }

  const deliverablesByProject = new Map<string, Deliverable[]>();
  for (const d of deliverables) {
    const list = deliverablesByProject.get(d.project_id) ?? [];
    list.push({
      id: d.id,
      projectId: d.project_id,
      title: d.title,
      contents: d.contents,
      startDate: d.start_date,
      dueDate: d.due_date,
      status: d.status,
      contractNote: d.contract_note,
      doneOn: d.done_on,
      blockers: blockersByDeliverable.get(d.id) ?? [],
      notes: notesByDeliverable.get(d.id) ?? [],
    });
    deliverablesByProject.set(d.project_id, list);
  }

  return projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    objective: p.objective,
    criteria: parseList(p.criteria),
    keywords: parseList(p.keywords),
    ongoing: Boolean(p.ongoing),
    deliverables: deliverablesByProject.get(p.id) ?? [],
  }));
}

export async function getLog(): Promise<LogEntry[]> {
  const rows = await all<{ id: number; date: string; kind: LogKind; platform: string; description: string }>(
    "SELECT id, date, kind, platform, description FROM log_entries ORDER BY date DESC, id DESC",
  );
  return rows.map((r) => ({ id: r.id, date: r.date, kind: r.kind, platform: r.platform, description: r.description }));
}

export async function getHours(): Promise<HourEntry[]> {
  const rows = await all<{ id: number; date: string; minutes: number; description: string }>(
    "SELECT id, date, minutes, description FROM extra_hours ORDER BY date DESC, id DESC",
  );
  return rows.map((r) => ({ id: r.id, date: r.date, minutes: Number(r.minutes), description: r.description }));
}

export async function getEventLinks(): Promise<EventLinks> {
  const rows = await all<{ uid: string; project_id: string | null; ignored: number }>("SELECT * FROM event_links");
  const links: EventLinks = {};
  for (const r of rows) links[r.uid] = { projectId: r.project_id, ignored: Boolean(r.ignored) };
  return links;
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await all<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string | null) {
  if (value === null) {
    await run("DELETE FROM settings WHERE key = ?", [key]);
    return;
  }
  await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [
    key,
    value,
  ]);
}
