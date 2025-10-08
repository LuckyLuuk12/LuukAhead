import type { RequestHandler } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { database } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });
	const { session, user } = await validateSessionToken(token, event);
	if (!session || !user) return new Response('Unauthorized', { status: 401 });

	const projectId = event.params.id;
	const priorityId = event.params.priorityId;
	if (!projectId || !priorityId) return new Response('Missing id', { status: 400 });

	const body = await event.request.json();
	const allowed = ['name', 'order', 'color'];
	const toUpdate: any = {};
	for (const k of allowed) if (k in body) toUpdate[k] = (body as any)[k];

	const { db } = await database(event);
	const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
	const p = proj.at(0);
	if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

	await db.update(schema.priorities).set(toUpdate).where(eq(schema.priorities.id, priorityId));
	return new Response(JSON.stringify({ ok: true }));
};

export const DELETE: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });
	const { session, user } = await validateSessionToken(token, event);
	if (!session || !user) return new Response('Unauthorized', { status: 401 });

	const projectId = event.params.id;
	const priorityId = event.params.priorityId;
	if (!projectId || !priorityId) return new Response('Missing id', { status: 400 });

	const { db } = await database(event);
	const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
	const p = proj.at(0);
	if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

	await db.delete(schema.priorities).where(eq(schema.priorities.id, priorityId));
	return new Response(null, { status: 204 });
};
