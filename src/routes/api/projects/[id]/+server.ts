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
	if (!body || typeof body.name !== 'string') return new Response('Missing name', { status: 400 });
	const newName = body.name.trim();
	if (!newName) return new Response('Name empty', { status: 400 });

	try {
		const { db } = await database(event);
		const { session, user } = await validateSessionToken(db, token);
		if (!session || !user) return new Response('Unauthorized', { status: 401 });

		// verify ownership
		const projRows = await db
			.select()
			.from(schema.project)
			.where(eq(schema.project.id, projectId));
		const p = projRows.at(0);
		if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

		// check duplicates (case-insensitive)
		const existing = await db
			.select()
			.from(schema.project)
			.where(eq(schema.project.ownerId, user.id));
		const dup = existing.find(
			(r: any) => r.id !== projectId && r.name.toLowerCase() === newName.toLowerCase()
		);
		if (dup) return new Response('Duplicate', { status: 409 });

		await db
			.update(schema.project)
			.set({ name: newName })
			.where(eq(schema.project.id, projectId));
		return new Response(JSON.stringify({ ok: true }));
	} catch (err) {
		console.error('Database error in PATCH /api/projects/[id]:', err);
		throw error(500, 'Failed to update project. Database connection error.');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const token = event.cookies.get('auth-session');
	if (!token) return new Response('Unauthorized', { status: 401 });

	const projectId = event.params.id;
	if (!projectId) return new Response('Missing project id', { status: 400 });

	try {
		const { db } = await database(event);
		const { session, user } = await validateSessionToken(db, token);
		if (!session || !user) return new Response('Unauthorized', { status: 401 });

		// verify ownership
		const projRows = await db
			.select()
			.from(schema.project)
			.where(eq(schema.project.id, projectId));
		const p = projRows.at(0);
		if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

		// Delete project (will cascade via foreign_keys in sqlite)
		await db.delete(schema.project).where(eq(schema.project.id, projectId));
		return new Response(null, { status: 204 });
	} catch (err) {
		console.error('Database error in DELETE /api/projects/[id]:', err);
		throw error(500, 'Failed to delete project. Database connection error.');
	}
};
