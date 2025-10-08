import type { RequestHandler } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const GET: RequestHandler = async ({ params, cookies }) => {
    const token = cookies.get('auth-session');
    if (!token) return new Response('Unauthorized', { status: 401 });
    const { session, user } = await validateSessionToken(token);
    if (!session || !user) return new Response('Unauthorized', { status: 401 });

    const projectId = params.id;
    if (!projectId) return new Response('Missing project id', { status: 400 });

    const rows = await db.select().from(schema.item_types).where(eq(schema.item_types.projectId, projectId));
    return new Response(JSON.stringify(rows));
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
    const token = cookies.get('auth-session');
    if (!token) return new Response('Unauthorized', { status: 401 });
    const { session, user } = await validateSessionToken(token);
    if (!session || !user) return new Response('Unauthorized', { status: 401 });

    const projectId = params.id;
    if (!projectId) return new Response('Missing project id', { status: 400 });

    const body = await request.json();
    const { name, order = 0, color = null } = body;
    if (!name) return new Response('Missing name', { status: 400 });

    // ensure ownership of project
    const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
    const p = proj.at(0);
    if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

    const id = uuidv4();
    await db.insert(schema.item_types).values({ id, projectId, name, order, color });
    return new Response(JSON.stringify({ id, projectId, name, order, color }), { status: 201 });
};
