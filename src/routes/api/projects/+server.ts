import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { validateSessionToken } from '$lib/server/auth';
import { database } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });
	
	try {
		const { db } = await database(event);
		const { session, user } = await validateSessionToken(db, token);
		if (!session || !user) return new Response('Unauthorized', { status: 401 });

		const rows = await db
			.select()
			.from(schema.project)
			.where(eq(schema.project.ownerId, user.id));
		return new Response(JSON.stringify(rows));
	} catch (err) {
		console.error('Database error in GET /api/projects:', err);
		throw error(500, 'Failed to fetch projects. Database connection error.');
	}
};

import { createProject } from '$lib/server/db/projects';

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json();
	const { name } = body;
	if (!name) return new Response('Missing name', { status: 400 });

	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });

	try {
		const { db, d1 } = await database(event);
		const { session, user } = await validateSessionToken(db, token);
		if (!session || !user) return new Response('Unauthorized', { status: 401 });

		const res = await createProject(db, d1, user.id, name);
		return new Response(JSON.stringify(res), { status: 201 });
	} catch (err) {
		console.error('Database error in POST /api/projects:', err);
		throw error(500, 'Failed to create project. Database connection error.');
	}
};
