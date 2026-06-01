import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_PATH ?? "./data/issuetracker.db";

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Auto-migrate: create tables if they don't exist. Idempotent.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    color TEXT NOT NULL DEFAULT '#f97316',
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    free_iteration_limit INTEGER NOT NULL DEFAULT 5,
    paid_iterations INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    iteration_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    submitter_name TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    billable INTEGER NOT NULL DEFAULT 0,
    owner_notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    resolved_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    metadata TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL,
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount_paise INTEGER NOT NULL,
    iterations_purchased INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    paid_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
  CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_issue ON attachments(issue_id);
  CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);
  CREATE INDEX IF NOT EXISTS idx_messages_issue ON messages(issue_id);
  CREATE INDEX IF NOT EXISTS idx_events_issue ON events(issue_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(owner_id);
`);

// Idempotent column additions for upgrading existing databases. SQLite's
// CREATE TABLE IF NOT EXISTS doesn't add new columns, so we attempt each
// ALTER and swallow the "duplicate column" error when the column is present.
const addColumns: Array<[string, string]> = [
  ["projects", "project_url TEXT"],
  ["projects", "logo_path TEXT"],
  ["projects", "brand_color TEXT"],
  ["projects", "due_date INTEGER"],
  ["issues", "priority TEXT NOT NULL DEFAULT 'normal'"],
  ["issues", "eta_at INTEGER"],
  ["issues", "client_approved_at INTEGER"],
  ["issues", "client_approved_by TEXT"],
  ["attachments", "message_id TEXT"],
  ["users", "last_notifications_read_at INTEGER"],
  ["issues", "assignee_id TEXT"],
];
for (const [table, col] of addColumns) {
  try {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${col};`);
  } catch (err: any) {
    if (!/duplicate column/i.test(String(err?.message ?? ""))) throw err;
  }
}
try {
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);`);
} catch {}

export const db = drizzle(sqlite, { schema });
export { schema };
