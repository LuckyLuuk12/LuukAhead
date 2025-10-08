import type { RequestHandler } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { database } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const GET: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });
	const { session, user } = await validateSessionToken(token, event);
	if (!session || !user) return new Response('Unauthorized', { status: 401 });

	const projectId = event.params.id;
	if (!projectId) return new Response('Missing project id', { status: 400 });

	const { db } = await database(event);
	const rows = await db
		.select()
		.from(schema.work_items)
		.where(eq(schema.work_items.projectId, projectId));
	return new Response(JSON.stringify(rows));
};

export const POST: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });
	const { session, user } = await validateSessionToken(token, event);
	if (!session || !user) return new Response('Unauthorized', { status: 401 });

	const projectId = event.params.id;
	if (!projectId) return new Response('Missing project id', { status: 400 });

	const body = await event.request.json();
	const {
		parent_id = null,
		title = 'New item',
		description = null,
		type_id = null,
		priority_id = null
	} = body;

	const { db } = await database(event);
	const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
	const p = proj.at(0);
	if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

	const id = uuidv4();
	const now = new Date();
	await db.insert(schema.work_items).values({
		id,
		projectId,
		parent_id,
		type_id,
		priority_id,
		title,
		description,
		remarks: null,
		deadline: null,
		owner_id: user.id,
		is_root: 0,
		created_at: now,
		updated_at: now
	});

	return new Response(JSON.stringify({ id }), { status: 201 });
};
