"use server";

import { revalidatePath } from "next/cache";
import { isOwner } from "@/lib/auth";
import { checkIcsUrl, clearCalendarCache, loadCalendar, normalizeIcsUrl } from "@/lib/calendar";
import { setSetting } from "@/lib/data";
import { all, db, run } from "@/lib/db";
import { isValidISO, todayISO } from "@/lib/dates";
import { parseDuration } from "@/lib/hours";
import { LOG_KIND_LABEL, STATUS_ORDER, type ActionResult, type LogKind, type Status } from "@/lib/types";

const AUTH_ERROR = "Sessione scaduta: ricarica la pagina e accedi di nuovo.";

const fail = (error: string): ActionResult => ({ ok: false, error });

async function saved(): Promise<ActionResult> {
  await setSetting("last_change", new Date().toISOString());
  revalidatePath("/");
  return { ok: true };
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/* Consegne */

export type DeliverablePatch = {
  status?: Status;
  doneOn?: string | null;
  startDate?: string | null;
  dueDate?: string;
  title?: string;
  contents?: string;
};

export async function updateDeliverable(id: number, patch: DeliverablePatch): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  const [current] = await all<{ start_date: string | null; due_date: string; status: Status }>(
    "SELECT start_date, due_date, status FROM deliverables WHERE id = ?",
    [id],
  );
  if (!current) return fail("Consegna non trovata.");

  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const set = (column: string, value: string | number | null) => {
    sets.push(`${column} = ?`);
    args.push(value);
  };

  const nextStatus = patch.status ?? current.status;
  if (patch.status !== undefined) {
    if (!STATUS_ORDER.includes(patch.status)) return fail("Stato non valido.");
    set("status", patch.status);
    if (patch.status !== "done") set("done_on", null);
    else if (patch.doneOn === undefined && current.status !== "done") set("done_on", todayISO());
  }
  if (patch.doneOn !== undefined && nextStatus === "done") {
    if (patch.doneOn !== null && !isValidISO(patch.doneOn)) return fail("Data di consegna non valida.");
    set("done_on", patch.doneOn);
  }

  if (patch.dueDate !== undefined) {
    if (!isValidISO(patch.dueDate)) return fail("Scadenza non valida.");
    set("due_date", patch.dueDate);
  }
  if (patch.startDate !== undefined) {
    if (patch.startDate !== null && !isValidISO(patch.startDate)) return fail("Data di inizio non valida.");
    set("start_date", patch.startDate);
  }
  const start = patch.startDate !== undefined ? patch.startDate : current.start_date;
  const due = patch.dueDate ?? current.due_date;
  if (start && start > due) return fail("L'inizio deve precedere la scadenza.");

  if (patch.title !== undefined) {
    const title = text(patch.title, 200);
    if (!title) return fail("Il titolo non può essere vuoto.");
    set("title", title);
  }
  if (patch.contents !== undefined) set("contents", text(patch.contents, 1000));

  if (sets.length === 0) return { ok: true };
  set("updated_at", new Date().toISOString());
  await run(`UPDATE deliverables SET ${sets.join(", ")} WHERE id = ?`, [...args, id]);
  return saved();
}

export async function createDeliverable(
  projectId: string,
  input: { title: string; contents: string; startDate: string | null; dueDate: string },
): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  const [project] = await all<{ ongoing: number }>("SELECT ongoing FROM projects WHERE id = ?", [projectId]);
  if (!project || project.ongoing) return fail("Progetto non valido.");
  const title = text(input.title, 200);
  if (!title) return fail("Serve un titolo.");
  if (!isValidISO(input.dueDate)) return fail("Serve una scadenza.");
  if (input.startDate !== null && !isValidISO(input.startDate)) return fail("Data di inizio non valida.");
  if (input.startDate && input.startDate > input.dueDate) return fail("L'inizio deve precedere la scadenza.");
  await run(
    `INSERT INTO deliverables (project_id, title, contents, start_date, due_date, sort, updated_at)
     VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM deliverables), ?)`,
    [projectId, title, text(input.contents, 1000), input.startDate, input.dueDate, new Date().toISOString()],
  );
  return saved();
}

export async function deleteDeliverable(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  const client = await db();
  await client.batch(
    [
      { sql: "DELETE FROM notes WHERE deliverable_id = ?", args: [id] },
      { sql: "DELETE FROM blockers WHERE deliverable_id = ?", args: [id] },
      { sql: "DELETE FROM deliverables WHERE id = ?", args: [id] },
    ],
    "write",
  );
  return saved();
}

/* Note (private to the owner) */

export async function addNote(
  deliverableId: number,
  input: { date: string; body: string; shared: boolean },
): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  if (!isValidISO(input.date)) return fail("Data non valida.");
  const body = text(input.body, 4000);
  if (!body) return fail("La nota è vuota.");
  const [exists] = await all<{ id: number }>("SELECT id FROM deliverables WHERE id = ?", [deliverableId]);
  if (!exists) return fail("Consegna non trovata.");
  await run("INSERT INTO notes (deliverable_id, date, body, shared, created_at) VALUES (?, ?, ?, ?, ?)", [
    deliverableId,
    input.date,
    body,
    input.shared ? 1 : 0,
    new Date().toISOString(),
  ]);
  return saved();
}

export async function setNoteShared(id: number, shared: boolean): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  await run("UPDATE notes SET shared = ? WHERE id = ?", [shared ? 1 : 0, id]);
  return saved();
}

export async function updateNote(id: number, rawBody: string): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  const body = text(rawBody, 4000);
  if (!body) return fail("La nota è vuota: per toglierla usa Elimina.");
  await run("UPDATE notes SET body = ? WHERE id = ?", [body, id]);
  return saved();
}

export async function deleteNote(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  await run("DELETE FROM notes WHERE id = ?", [id]);
  return saved();
}

/* Attese esterne */

export async function openBlocker(
  deliverableId: number,
  input: { party: string; reason: string; openedOn: string },
): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  const party = text(input.party, 80);
  if (!party) return fail("Indica chi stai aspettando.");
  if (!isValidISO(input.openedOn)) return fail("Data non valida.");
  const [exists] = await all<{ id: number }>("SELECT id FROM deliverables WHERE id = ?", [deliverableId]);
  if (!exists) return fail("Consegna non trovata.");
  await run("INSERT INTO blockers (deliverable_id, party, reason, opened_on, created_at) VALUES (?, ?, ?, ?, ?)", [
    deliverableId,
    party,
    text(input.reason, 500),
    input.openedOn,
    new Date().toISOString(),
  ]);
  return saved();
}

export async function resolveBlocker(id: number, resolvedOn: string): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  if (!isValidISO(resolvedOn)) return fail("Data non valida.");
  const [blocker] = await all<{ opened_on: string }>("SELECT opened_on FROM blockers WHERE id = ?", [id]);
  if (!blocker) return fail("Attesa non trovata.");
  await run("UPDATE blockers SET resolved_on = ? WHERE id = ?", [resolvedOn < blocker.opened_on ? blocker.opened_on : resolvedOn, id]);
  return saved();
}

export async function reopenBlocker(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  await run("UPDATE blockers SET resolved_on = NULL WHERE id = ?", [id]);
  return saved();
}

export async function deleteBlocker(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  await run("DELETE FROM blockers WHERE id = ?", [id]);
  return saved();
}

/* Registro piattaforme attuali */

export async function addLogEntry(input: {
  date: string;
  kind: LogKind;
  platform: string;
  description: string;
}): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  if (!isValidISO(input.date)) return fail("Data non valida.");
  if (!(input.kind in LOG_KIND_LABEL)) return fail("Tipo non valido.");
  const platform = text(input.platform, 60);
  const description = text(input.description, 1000);
  if (!platform) return fail("Scegli una piattaforma.");
  if (!description) return fail("Descrivi l'intervento.");
  await run("INSERT INTO log_entries (date, kind, platform, description, created_at) VALUES (?, ?, ?, ?, ?)", [
    input.date,
    input.kind,
    platform,
    description,
    new Date().toISOString(),
  ]);
  return saved();
}

export async function deleteLogEntry(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  await run("DELETE FROM log_entries WHERE id = ?", [id]);
  return saved();
}

/* Ore bandi */

export async function addHours(input: { date: string; duration: string; description: string }): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  if (!isValidISO(input.date)) return fail("Data non valida.");
  const minutes = parseDuration(input.duration);
  if (minutes === null || minutes <= 0 || minutes > 24 * 60) return fail("Durata non valida: prova 1:30, 1,5 o 45m.");
  const description = text(input.description, 500);
  if (!description) return fail("Indica il bando o l'attività.");
  await run("INSERT INTO extra_hours (date, minutes, description, created_at) VALUES (?, ?, ?, ?)", [
    input.date,
    minutes,
    description,
    new Date().toISOString(),
  ]);
  return saved();
}

export async function deleteHours(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  await run("DELETE FROM extra_hours WHERE id = ?", [id]);
  return saved();
}

/* Progetti e agenda */

export async function saveKeywords(projectId: string, raw: string): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  const keywords = [
    ...new Set(
      raw
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 30);
  await run("UPDATE projects SET keywords = ? WHERE id = ?", [JSON.stringify(keywords), projectId]);
  return saved();
}

export async function setEventLink(uid: string, value: string): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  if (!uid) return fail("Evento non valido.");
  if (value === "auto") {
    await run("DELETE FROM event_links WHERE uid = ?", [uid]);
  } else if (value === "ignore") {
    await run(
      "INSERT INTO event_links (uid, project_id, ignored) VALUES (?, NULL, 1) ON CONFLICT(uid) DO UPDATE SET project_id = NULL, ignored = 1",
      [uid],
    );
  } else {
    const [project] = await all<{ id: string }>("SELECT id FROM projects WHERE id = ?", [value]);
    if (!project) return fail("Progetto non valido.");
    await run(
      "INSERT INTO event_links (uid, project_id, ignored) VALUES (?, ?, 0) ON CONFLICT(uid) DO UPDATE SET project_id = excluded.project_id, ignored = 0",
      [uid, value],
    );
  }
  return saved();
}

export async function saveCalendarUrl(raw: string): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  const value = raw.trim();
  if (!value) {
    await setSetting("ics_url", null);
    return saved();
  }
  const problem = checkIcsUrl(value);
  if (problem) return fail(problem);
  const today = todayISO();
  const probe = await loadCalendar(value, { from: today, to: today }, true);
  if (!probe.ok) return fail(probe.message);
  await setSetting("ics_url", normalizeIcsUrl(value));
  return saved();
}

export async function refreshCalendar(): Promise<ActionResult> {
  if (!(await isOwner())) return fail(AUTH_ERROR);
  clearCalendarCache();
  revalidatePath("/");
  return { ok: true };
}
