export type Status = "todo" | "doing" | "review" | "done";

export const STATUS_ORDER: Status[] = ["todo", "doing", "review", "done"];

export const STATUS_LABEL: Record<Status, string> = {
  todo: "Da fare",
  doing: "In corso",
  review: "In revisione",
  done: "Consegnata",
};

export type Blocker = {
  id: number;
  deliverableId: number;
  party: string;
  reason: string;
  openedOn: string;
  resolvedOn: string | null;
};

export type Note = {
  id: number;
  deliverableId: number;
  date: string;
  body: string;
  /** Shown in the client view and PDF only when true. */
  shared: boolean;
};

export type Deliverable = {
  id: number;
  projectId: string;
  title: string;
  contents: string;
  startDate: string | null;
  dueDate: string;
  status: Status;
  contractNote: string;
  doneOn: string | null;
  blockers: Blocker[];
  /** Newest first. The client view receives only the shared ones. */
  notes: Note[];
};

export type Project = {
  id: string;
  code: string;
  name: string;
  objective: string;
  criteria: string[];
  keywords: string[];
  ongoing: boolean;
  deliverables: Deliverable[];
};

export type LogKind = "intervento" | "review" | "piano";

export const LOG_KIND_LABEL: Record<LogKind, string> = {
  intervento: "Intervento rilasciato",
  review: "Review",
  piano: "Piano di intervento",
};

export const PLATFORMS = ["loquis.com", "loquis.biz", "Loquis Studio", "Social"] as const;

export type LogEntry = {
  id: number;
  date: string;
  kind: LogKind;
  platform: string;
  description: string;
};

export type HourEntry = {
  id: number;
  date: string;
  minutes: number;
  description: string;
};

export type Relation = {
  deliverableId: number;
  projectId: string;
  code: string;
  title: string;
  /** during: inside a period; before/after: days to/from the due date; same: on the due date */
  kind: "during" | "before" | "same" | "after";
  days: number;
};

export type AgendaItem = {
  key: string;
  uid: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string;
  projectIds: string[];
  source: "manual" | "keyword" | "none";
  ignored: boolean;
  relations: Relation[];
};

export type CalendarState =
  | { status: "missing" }
  | { status: "error"; message: string; urlHint: string }
  | { status: "ok"; fetchedAt: number; urlHint: string; count: number };

export type ActionResult = { ok: true } | { ok: false; error: string };
