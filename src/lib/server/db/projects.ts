import { db, sqliteClient } from './index';
import * as schema from './schema';
import { v4 as uuidv4 } from 'uuid';

// Create a project and a root work item inside a transaction
export async function createProject(ownerId: string, name: string) {
	const projectId = uuidv4();
	const rootItemId = uuidv4();
	const nowSec = Math.floor(Date.now() / 1000);

	// Use better-sqlite3 transaction for synchronous, atomic writes.
	// default types and priorities to seed a new project
	const defaultTypes = ['Epic', 'Feature', 'User Story', 'Task'];
	const defaultPriorities = ['MUST', 'SHOULD', 'COULD', 'WISH'];

	try {
		const tr = sqliteClient.transaction(() => {
			const insertProject = sqliteClient.prepare(`INSERT INTO luukahead_project (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)`);
			insertProject.run(projectId, name, ownerId, nowSec);

			const insertItem = sqliteClient.prepare(`INSERT INTO luukahead_work_items (id, project_id, parent_id, type_id, priority_id, title, description, remarks, deadline, owner_id, is_root, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
			insertItem.run(rootItemId, projectId, null, null, null, name, 'Project root', null, null, ownerId, 1, nowSec, nowSec);

			const insertType = sqliteClient.prepare(`INSERT INTO luukahead_item_types (id, project_id, name, "order", color) VALUES (?, ?, ?, ?, ?)`);
			for (let i = 0; i < defaultTypes.length; i++) {
				const tid = uuidv4();
				insertType.run(tid, projectId, defaultTypes[i], i, null);
			}

			const insertPrio = sqliteClient.prepare(`INSERT INTO luukahead_priorities (id, project_id, name, "order", color) VALUES (?, ?, ?, ?, ?)`);
			for (let i = 0; i < defaultPriorities.length; i++) {
				const pid = uuidv4();
				insertPrio.run(pid, projectId, defaultPriorities[i], i, null);
			}
		});
		tr();
		return { projectId, rootItemId };
	} catch (e) {
		// fallback: attempt to use drizzle inserts (not transactional here)
		await db.insert(schema.project).values({ id: projectId, name, ownerId, createdAt: new Date() });
		await db.insert(schema.work_items).values({ id: rootItemId, projectId, parent_id: null, type_id: null, priority_id: null, title: name, description: 'Project root', remarks: null, deadline: null, owner_id: ownerId, is_root: 1, created_at: new Date(), updated_at: new Date() });

		// insert defaults via drizzle
		for (let i = 0; i < defaultTypes.length; i++) {
			await db.insert(schema.item_types).values({ id: uuidv4(), projectId, name: defaultTypes[i], order: i, color: null });
		}
		for (let i = 0; i < defaultPriorities.length; i++) {
			await db.insert(schema.priorities).values({ id: uuidv4(), projectId, name: defaultPriorities[i], order: i, color: null });
		}

		return { projectId, rootItemId };
	}
}
