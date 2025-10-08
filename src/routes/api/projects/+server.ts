import type { RequestHandler } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });
	const { session, user } = await validateSessionToken(token);
	if (!session || !user) return new Response('Unauthorized', { status: 401 });

	const rows = await db.select().from(schema.project).where(eq(schema.project.ownerId, user.id));
	return new Response(JSON.stringify(rows));
};

import { createProject } from '$lib/server/db/projects';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const { name } = body;
	if (!name) return new Response('Missing name', { status: 400 });

	const token = cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });

	const { session, user } = await validateSessionToken(token);
	if (!session || !user) return new Response('Unauthorized', { status: 401 });

	const res = await createProject(user.id, name);
	return new Response(JSON.stringify(res), { status: 201 });
};
