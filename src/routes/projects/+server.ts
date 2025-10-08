import type { RequestHandler } from './$types';
import { createProject } from '$lib/server/db/projects';
import { validateSessionToken } from '$lib/server/auth';
import { database } from '$lib/server/db';

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json();
	const { name } = body;
	if (!name) return new Response('Missing name', { status: 400 });

	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });

	const { session, user } = await validateSessionToken(token, event);
	if (!session || !user) return new Response('Unauthorized', { status: 401 });

	const { db, d1 } = await database(event);
	const res = await createProject(db, d1, user.id, name);
	return new Response(JSON.stringify(res), { status: 201 });
};
