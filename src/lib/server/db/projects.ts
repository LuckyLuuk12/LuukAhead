import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';
import { v4 as uuidv4 } from 'uuid';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// Create a project and a root work item using D1 batch operations
export async function createProject(
	db: DrizzleD1Database<typeof schema>,
	d1: D1Database,
	ownerId: string,
	name: string
) {
	const projectId = uuidv4();
	const rootItemId = uuidv4();
	const nowSec = Math.floor(Date.now() / 1000);

	// Default types and priorities to seed a new project
	const defaultTypes = ['Epic', 'Feature', 'User Story', 'Task'];
	const defaultPriorities = ['MUST', 'SHOULD', 'COULD', 'WISH'];

	try {
		// Use D1 batch for atomic operations
		const statements = [
			d1.prepare(
				`INSERT INTO luukahead_project (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)`
			).bind(projectId, name, ownerId, nowSec),
			d1.prepare(
				`INSERT INTO luukahead_work_items (id, project_id, parent_id, type_id, priority_id, title, description, remarks, deadline, owner_id, is_root, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(
				rootItemId,
				projectId,
				null,
				null,
				null,
				name,
				'Project root',
				null,
				null,
				ownerId,
				1,
				'todo',
				nowSec,
				nowSec
			)
		];

		// Add default types
		for (let i = 0; i < defaultTypes.length; i++) {
			const tid = uuidv4();
			statements.push(
				d1.prepare(
					`INSERT INTO luukahead_item_types (id, project_id, name, "order", color) VALUES (?, ?, ?, ?, ?)`
				).bind(tid, projectId, defaultTypes[i], i, null)
			);
		}

		// Add default priorities
		for (let i = 0; i < defaultPriorities.length; i++) {
			const pid = uuidv4();
			statements.push(
				d1.prepare(
					`INSERT INTO luukahead_priorities (id, project_id, name, "order", color) VALUES (?, ?, ?, ?, ?)`
				).bind(pid, projectId, defaultPriorities[i], i, null)
			);
		}

		await d1.batch(statements);
		return { projectId, rootItemId };
	} catch (e) {
		// Fallback: attempt to use drizzle inserts (not transactional)
		await db.insert(schema.project).values({
			id: projectId,
			name,
			ownerId,
			createdAt: new Date()
		});
		await db.insert(schema.work_items).values({
			id: rootItemId,
			projectId,
			parent_id: null,
			type_id: null,
			priority_id: null,
			title: name,
			description: 'Project root',
			remarks: null,
			deadline: null,
			owner_id: ownerId,
			is_root: 1,
			status: 'todo',
			created_at: new Date(),
			updated_at: new Date()
		});

		// Insert defaults via drizzle
		for (let i = 0; i < defaultTypes.length; i++) {
			await db
				.insert(schema.item_types)
				.values({ id: uuidv4(), projectId, name: defaultTypes[i], order: i, color: null });
		}
		for (let i = 0; i < defaultPriorities.length; i++) {
			await db
				.insert(schema.priorities)
				.values({ id: uuidv4(), projectId, name: defaultPriorities[i], order: i, color: null });
		}

		return { projectId, rootItemId };
	}
}