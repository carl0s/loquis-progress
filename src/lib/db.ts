import { createClient, type Client, type InArgs } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { SEED_DELIVERABLES, SEED_PROJECTS } from "./seed";

// Production (Vercel): remote libSQL database from the Turso Marketplace integration.
// Local development: a SQLite file in ./data (override with LOQUIS_DB_PATH).
const REMOTE_URL = process.env.TURSO_DATABASE_URL;
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const DB_PATH = process.env.LOQUIS_DB_PATH ?? path.join(process.cwd(), "data", "loquis.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  criteria TEXT NOT NULL DEFAULT '[]',
  keywords TEXT NOT NULL DEFAULT '[]',
  ongoing INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS deliverables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  contents TEXT NOT NULL DEFAULT '',
  start_date TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  note TEXT NOT NULL DEFAULT '',
  contract_note TEXT NOT NULL DEFAULT '',
  done_on TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blockers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliverable_id INTEGER NOT NULL REFERENCES deliverables(id),
  party TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  opened_on TEXT NOT NULL,
  resolved_on TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliverable_id INTEGER NOT NULL REFERENCES deliverables(id),
  date TEXT NOT NULL,
  body TEXT NOT NULL,
  shared INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS log_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  kind TEXT NOT NULL,
  platform TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS extra_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event_links (
  uid TEXT PRIMARY KEY,
  project_id TEXT,
  ignored INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// Columns added after the first release: CREATE TABLE IF NOT EXISTS does not add them to existing tables.
const ADDED_COLUMNS = [
  { table: "notes", column: "shared", ddl: "ALTER TABLE notes ADD COLUMN shared INTEGER NOT NULL DEFAULT 0" },
];

// Identifies schema + migrations: any change to either re-runs initialisation (see db()).
const VERSION = SCHEMA + JSON.stringify(ADDED_COLUMNS);

// One write transaction. Projects go first (deliverables reference them); the "seeded" marker,
// written last, keeps two concurrent cold starts from inserting the deliverables twice.
async function seed(client: Client) {
  const now = new Date().toISOString();
  await client.batch(
    [
      ...SEED_PROJECTS.map((p, i) => ({
        sql: "INSERT OR IGNORE INTO projects (id, code, name, objective, criteria, keywords, ongoing, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [p.id, p.code, p.name, p.objective, JSON.stringify(p.criteria), JSON.stringify(p.keywords), p.ongoing ? 1 : 0, i],
      })),
      ...SEED_DELIVERABLES.map((d, i) => ({
        sql: `INSERT INTO deliverables (project_id, title, contents, start_date, due_date, contract_note, sort, updated_at)
              SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'seeded')`,
        args: [d.projectId, d.title, d.contents, d.startDate ?? null, d.dueDate, d.contractNote ?? "", i, now],
      })),
      { sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('seeded', ?)", args: [now] },
    ],
    "write",
  );
}

async function open(): Promise<Client> {
  if (!REMOTE_URL && process.env.VERCEL) {
    throw new Error("Database non configurato: collega Turso al progetto Vercel (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN).");
  }
  if (!REMOTE_URL) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const client = createClient(REMOTE_URL ? { url: REMOTE_URL, authToken: AUTH_TOKEN } : { url: `file:${DB_PATH}` });
  await client.executeMultiple(SCHEMA);
  for (const { table, column, ddl } of ADDED_COLUMNS) {
    const { rows: columns } = await client.execute(`PRAGMA table_info(${table})`);
    if (columns.some((c) => c.name === column)) continue;
    try {
      await client.execute(ddl);
    } catch (error) {
      // A concurrent cold start may have added it first.
      if (!String(error).includes("duplicate column")) throw error;
    }
  }
  const { rows } = await client.execute("SELECT COUNT(*) AS n FROM projects");
  if (Number(rows[0].n) === 0) await seed(client);
  // Legacy single-field notes become the first entry of the per-deliverable note log.
  await client.batch(
    [
      "INSERT INTO notes (deliverable_id, date, body, created_at) SELECT id, substr(updated_at, 1, 10), note, updated_at FROM deliverables WHERE note <> ''",
      "UPDATE deliverables SET note = '' WHERE note <> ''",
    ],
    "write",
  );
  return client;
}

// One client per server instance, kept across dev hot reloads. The cache remembers the VERSION it
// was initialised with: when schema or migrations change (dev), initialisation runs again on a fresh client.
const store = globalThis as typeof globalThis & { __loquisDbCache?: { version: string; client: Promise<Client> } };

export function db(): Promise<Client> {
  let cached = store.__loquisDbCache;
  if (cached?.version !== VERSION) {
    cached?.client.then((previous) => previous.close()).catch(() => {});
    const client = open().catch((error) => {
      store.__loquisDbCache = undefined;
      throw error;
    });
    cached = { version: VERSION, client };
    store.__loquisDbCache = cached;
  }
  return cached.client;
}

export async function all<T>(sql: string, args: InArgs = []): Promise<T[]> {
  const client = await db();
  const result = await client.execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function run(sql: string, args: InArgs = []) {
  const client = await db();
  return client.execute({ sql, args });
}
