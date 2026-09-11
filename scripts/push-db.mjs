// Copies the local database (data/loquis.db) to the remote Turso database used on Vercel.
//
//   vercel env pull .env.production.local --environment=production
//   yarn db:push            # refuses if the remote already has data
//   yarn db:push --force    # replaces the remote data with the local data
//
// Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from the environment or from .env.production.local.

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const ENV_FILE = ".env.production.local";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadEnvFile(ENV_FILE);

const remoteUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const localPath = process.env.LOQUIS_DB_PATH ?? path.join(process.cwd(), "data", "loquis.db");
const force = process.argv.includes("--force");

if (!remoteUrl) {
  console.error(
    `Manca TURSO_DATABASE_URL. Collega Turso al progetto Vercel, poi:\n  vercel env pull ${ENV_FILE} --environment=production`,
  );
  process.exit(1);
}
if (!fs.existsSync(localPath)) {
  console.error(`Database locale non trovato: ${localPath}. Apri prima la dashboard in locale (yarn dev).`);
  process.exit(1);
}

// Parents before children, so foreign keys hold while inserting (and the reverse while deleting).
const ORDER = ["projects", "deliverables", "blockers", "notes", "log_entries", "extra_hours", "event_links", "settings"];

const local = createClient({ url: `file:${localPath}` });
const remote = createClient({ url: remoteUrl, authToken });

const { rows: tableRows } = await local.execute(
  "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
);
const localTables = new Map(tableRows.map((r) => [String(r.name), String(r.sql)]));
const tables = [...ORDER.filter((t) => localTables.has(t)), ...[...localTables.keys()].filter((t) => !ORDER.includes(t))];

// Same schema as local (columns added later included).
for (const table of tables) {
  await remote.execute(localTables.get(table).replace(/^CREATE TABLE\s+(IF NOT EXISTS\s+)?/i, "CREATE TABLE IF NOT EXISTS "));
}
const { rows: remoteColumns } = await remote.execute("PRAGMA table_info(notes)");
if (localTables.has("notes") && !remoteColumns.some((c) => c.name === "shared")) {
  await remote.execute("ALTER TABLE notes ADD COLUMN shared INTEGER NOT NULL DEFAULT 0");
}

let remoteRows = 0;
for (const table of tables) {
  const { rows } = await remote.execute(`SELECT COUNT(*) AS n FROM "${table}"`);
  remoteRows += Number(rows[0].n);
}
if (remoteRows > 0 && !force) {
  console.error(
    `Il database remoto contiene già ${remoteRows} righe (probabilmente il primo avvio online ha creato i dati iniziali).\n` +
      "Rilancia con --force per sostituirle con i dati locali: yarn db:push --force",
  );
  process.exit(1);
}

const statements = [...tables].reverse().map((table) => `DELETE FROM "${table}"`);
const summary = [];
for (const table of tables) {
  const result = await local.execute(`SELECT * FROM "${table}"`);
  const columns = result.columns.map((c) => `"${c}"`).join(", ");
  const marks = result.columns.map(() => "?").join(", ");
  for (const row of result.rows) {
    statements.push({ sql: `INSERT INTO "${table}" (${columns}) VALUES (${marks})`, args: result.columns.map((c) => row[c]) });
  }
  summary.push(`${table}: ${result.rows.length}`);
}

// One transaction: either everything is copied or nothing changes.
await remote.batch(statements, "write");
console.log(`Copiato su ${new URL(remoteUrl).host || remoteUrl}\n  ${summary.join("\n  ")}`);
