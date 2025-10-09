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
	const typeId = event.params.typeId;
	if (!projectId || !typeId) return new Response('Missing id', { status: 400 });

	const body = await event.request.json();
	const allowed = ['name', 'order', 'color'];
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

		await db.update(schema.item_types).set(toUpdate).where(eq(schema.item_types.id, typeId));
		return new Response(JSON.stringify({ ok: true }));
	} catch (err) {
		console.error('Database error in PATCH /api/projects/[id]/item-types/[typeId]:', err);
		throw error(500, 'Failed to update item type. Database connection error.');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });

	const projectId = event.params.id;
	const typeId = event.params.typeId;
	if (!projectId || !typeId) return new Response('Missing id', { status: 400 });

	try {
		const { db } = await database(event);
		const { session, user } = await validateSessionToken(db, token);
		if (!session || !user) return new Response('Unauthorized', { status: 401 });

		const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
		const p = proj.at(0);
		if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

		await db.delete(schema.item_types).where(eq(schema.item_types.id, typeId));
		return new Response(null, { status: 204 });
	} catch (err) {
		console.error('Database error in DELETE /api/projects/[id]/item-types/[typeId]:', err);
		throw error(500, 'Failed to delete item type. Database connection error.');
	}
};
