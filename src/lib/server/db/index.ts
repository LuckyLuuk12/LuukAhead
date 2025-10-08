import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);
// expose the raw client for low-level operations that need better-sqlite3 transaction helper
export const sqliteClient = client;

// Enable foreign keys in SQLite
try {
		client.pragma('foreign_keys = ON');
} catch (e) {
		// ignore
}

// Ensure tables exist (simple runtime initialization for local development).
// For production / Cloudflare D1 you should use proper migrations (drizzle-kit) instead.
const initSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS luukahead_user (
	id TEXT PRIMARY KEY,
	age INTEGER,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS luukahead_session (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	FOREIGN KEY(user_id) REFERENCES luukahead_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS luukahead_project (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	owner_id TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	FOREIGN KEY(owner_id) REFERENCES luukahead_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS luukahead_item_types (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	name TEXT NOT NULL,
	"order" INTEGER DEFAULT 0,
	color TEXT,
	FOREIGN KEY(project_id) REFERENCES luukahead_project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS luukahead_priorities (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	name TEXT NOT NULL,
	"order" INTEGER DEFAULT 0,
	color TEXT,
	FOREIGN KEY(project_id) REFERENCES luukahead_project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS luukahead_work_items (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	parent_id TEXT,
	type_id TEXT,
	priority_id TEXT,
	title TEXT NOT NULL,
	description TEXT,
	remarks TEXT,
	deadline INTEGER,
	owner_id TEXT,
	is_root INTEGER DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	FOREIGN KEY(project_id) REFERENCES luukahead_project(id) ON DELETE CASCADE,
	FOREIGN KEY(parent_id) REFERENCES luukahead_work_items(id) ON DELETE CASCADE,
	FOREIGN KEY(type_id) REFERENCES luukahead_item_types(id),
	FOREIGN KEY(priority_id) REFERENCES luukahead_priorities(id),
	FOREIGN KEY(owner_id) REFERENCES luukahead_user(id)
);

CREATE TABLE IF NOT EXISTS luukahead_work_item_visibility (
	work_item_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	PRIMARY KEY(work_item_id, user_id),
	FOREIGN KEY(work_item_id) REFERENCES luukahead_work_items(id) ON DELETE CASCADE,
	FOREIGN KEY(user_id) REFERENCES luukahead_user(id)
);
`;

try {
		client.exec(initSql);
} catch (e) {
		// If initialization fails, log it but don't crash here; migrations are preferred for production.
		// eslint-disable-next-line no-console
		console.error('Failed to initialize database schema:', e);
}

export const db = drizzle(client, { schema });
