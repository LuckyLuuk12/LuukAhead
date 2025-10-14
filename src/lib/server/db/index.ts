// This version works for Cloudflare Workers/D1 using Drizzle's D1 driver.
// You must provide the D1 binding (e.g., from the platform/env object in SvelteKit endpoints).

import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

export { drizzle };
export type { D1Database };

/**
 * When needing a db instance in a SvelteKit endpoint or action,
 * you can use this function to get a Drizzle instance connected to the D1 database.
 * ```
 * const db = database(event);
 * ```
 * @throws Error if the D1 database binding is not available
 */
export const database = async (event: any) => {
	try {
		if (!event.platform?.env?.DB) {
			throw new Error('D1 database binding not found. Make sure DB is configured in wrangler.toml');
		}

		const d1 = event.platform.env.DB as D1Database;
		const db = drizzle(d1, { schema });

		const isDev = event.platform?.env?.DEV_DB_AUTOCREATE === 'true';

		if (isDev) {
			// Use D1 binding directly for raw SQL to check and create tables
			const tablesRes = await d1
				.prepare(
					`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'luukahead_%';`
				)
				.all();
			const foundTables = new Set(tablesRes.results?.map((row: any) => row.name));

			// Create tables if they don't exist
			if (!foundTables.has('luukahead_user')) {
				await d1.batch([d1.prepare(CREATE_USER_TABLE_SQL)]);
			}
			if (!foundTables.has('luukahead_session')) {
				await d1.batch([d1.prepare(CREATE_SESSION_TABLE_SQL)]);
			}
			if (!foundTables.has('luukahead_project')) {
				await d1.batch([d1.prepare(CREATE_PROJECT_TABLE_SQL)]);
			}
			if (!foundTables.has('luukahead_item_types')) {
				await d1.batch([d1.prepare(CREATE_ITEM_TYPES_TABLE_SQL)]);
			}
			if (!foundTables.has('luukahead_priorities')) {
				await d1.batch([d1.prepare(CREATE_PRIORITIES_TABLE_SQL)]);
			}
			if (!foundTables.has('luukahead_work_items')) {
				await d1.batch([d1.prepare(CREATE_WORK_ITEMS_TABLE_SQL)]);
			}
			if (!foundTables.has('luukahead_work_item_visibility')) {
				await d1.batch([d1.prepare(CREATE_WORK_ITEM_VISIBILITY_TABLE_SQL)]);
			}
		}

		return { db, d1 };
	} catch (err) {
		console.error('Database connection error:', err);
		throw new Error(
			err instanceof Error
				? `Database connection failed: ${err.message}`
				: 'Database connection failed'
		);
	}
};

const CREATE_USER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS luukahead_user (
	id TEXT PRIMARY KEY,
	age INTEGER,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT,
	google_id TEXT UNIQUE,
	microsoft_id TEXT UNIQUE
);
`;

const CREATE_SESSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS luukahead_session (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	FOREIGN KEY(user_id) REFERENCES luukahead_user(id) ON DELETE CASCADE
);
`;

const CREATE_PROJECT_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS luukahead_project (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	owner_id TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	FOREIGN KEY(owner_id) REFERENCES luukahead_user(id) ON DELETE CASCADE
);
`;

const CREATE_ITEM_TYPES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS luukahead_item_types (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	name TEXT NOT NULL,
	"order" INTEGER DEFAULT 0,
	color TEXT,
	FOREIGN KEY(project_id) REFERENCES luukahead_project(id) ON DELETE CASCADE
);
`;

const CREATE_PRIORITIES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS luukahead_priorities (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	name TEXT NOT NULL,
	"order" INTEGER DEFAULT 0,
	color TEXT,
	FOREIGN KEY(project_id) REFERENCES luukahead_project(id) ON DELETE CASCADE
);
`;

const CREATE_WORK_ITEMS_TABLE_SQL = `
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
	completed INTEGER DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	FOREIGN KEY(project_id) REFERENCES luukahead_project(id) ON DELETE CASCADE,
	FOREIGN KEY(parent_id) REFERENCES luukahead_work_items(id) ON DELETE CASCADE,
	FOREIGN KEY(type_id) REFERENCES luukahead_item_types(id) ON DELETE SET NULL,
	FOREIGN KEY(priority_id) REFERENCES luukahead_priorities(id) ON DELETE SET NULL,
	FOREIGN KEY(owner_id) REFERENCES luukahead_user(id) ON DELETE SET NULL
);
`;

const CREATE_WORK_ITEM_VISIBILITY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS luukahead_work_item_visibility (
	work_item_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	PRIMARY KEY(work_item_id, user_id),
	FOREIGN KEY(work_item_id) REFERENCES luukahead_work_items(id) ON DELETE CASCADE,
	FOREIGN KEY(user_id) REFERENCES luukahead_user(id)
);
`;

