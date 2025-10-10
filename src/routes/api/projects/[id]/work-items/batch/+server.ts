import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { validateSessionToken } from '$lib/server/auth';
import { database } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });

	const projectId = event.params.id;
	if (!projectId) return new Response('Missing project id', { status: 400 });

	const body = await event.request.json();
	const { updates } = body;

	if (!Array.isArray(updates) || updates.length === 0) {
		return new Response('Invalid updates payload', { status: 400 });
	}

	try {
		const { db } = await database(event);
		const { session, user } = await validateSessionToken(db, token);
		if (!session || !user) return new Response('Unauthorized', { status: 401 });

		// Validate that all items belong to this project
		const itemIds = updates.map((u: any) => u.id);
		const existingItems = await db
			.select()
			.from(schema.work_items)
			.where(eq(schema.work_items.projectId, projectId));

		const validIds = new Set(existingItems.map(item => item.id));
		const invalidIds = itemIds.filter((id: string) => !validIds.has(id));

		if (invalidIds.length > 0) {
			return new Response(`Invalid item IDs: ${invalidIds.join(', ')}`, { status: 400 });
		}

		// Perform batch updates
		const results = [];
		for (const update of updates) {
			const { id, ...changes } = update;
			
			// Filter allowed fields
			const allowedFields = ['type_id', 'status', 'priority_id', 'title', 'description', 'remarks', 'deadline', 'parent_id'];
			const filteredChanges: any = {};
			
			for (const key of Object.keys(changes)) {
				if (allowedFields.includes(key)) {
					filteredChanges[key] = changes[key];
				}
			}

			if (Object.keys(filteredChanges).length === 0) continue;

			await db
				.update(schema.work_items)
				.set(filteredChanges)
				.where(eq(schema.work_items.id, id));
				
			results.push({ id, updated: true });
		}

		return new Response(JSON.stringify({ success: true, updated: results.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Database error in PATCH /api/projects/[id]/work-items/batch:', err);
		throw error(500, 'Failed to batch update work items');
	}
};
