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
	const itemId = event.params.itemId;
	if (!projectId || !itemId) return new Response('Missing id', { status: 400 });

	const body = await event.request.json();
	const allowed = [
		'parent_id',
		'title',
		'description',
		'type_id',
		'priority_id',
		'remarks',
		'deadline',
		'owner_id',
		'is_root',
		'completed'
	];
	const toUpdate: any = {};
	for (const k of allowed) if (k in body) toUpdate[k] = (body as any)[k];

	try {
		const { db } = await database(event);
		const { session, user } = await validateSessionToken(db, token);
		if (!session || !user) return new Response('Unauthorized', { status: 401 });

		// verify ownership
		const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
		const p = proj.at(0);
		if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

		await db.update(schema.work_items).set(toUpdate).where(eq(schema.work_items.id, itemId));
		return new Response(JSON.stringify({ ok: true }));
	} catch (err) {
		console.error('Database error in PATCH /api/projects/[id]/work-items/[itemId]:', err);
		throw error(500, 'Failed to update work item. Database connection error.');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });

	const projectId = event.params.id;
	const itemId = event.params.itemId;
	if (!projectId || !itemId) return new Response('Missing id', { status: 400 });

	try {
		const { db } = await database(event);
		const { session, user } = await validateSessionToken(db, token);
		if (!session || !user) return new Response('Unauthorized', { status: 401 });

		const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
		const p = proj.at(0);
		if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

		await db.delete(schema.work_items).where(eq(schema.work_items.id, itemId));
		return new Response(null, { status: 204 });
	} catch (err) {
		console.error('Database error in DELETE /api/projects/[id]/work-items/[itemId]:', err);
		throw error(500, 'Failed to delete work item. Database connection error.');
	}
};
