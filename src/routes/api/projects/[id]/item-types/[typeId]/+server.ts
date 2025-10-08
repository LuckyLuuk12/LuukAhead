import type { RequestHandler } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
  const token = cookies.get('auth-session');
  if (!token) return new Response('Unauthorized', { status: 401 });
  const { session, user } = await validateSessionToken(token);
  if (!session || !user) return new Response('Unauthorized', { status: 401 });

  const projectId = params.id;
  const typeId = params.typeId;
  if (!projectId || !typeId) return new Response('Missing id', { status: 400 });

  const body = await request.json();
  const allowed = ['name', 'order', 'color'];
  const toUpdate: any = {};
  for (const k of allowed) if (k in body) toUpdate[k] = (body as any)[k];

  // verify ownership
  const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
  const p = proj.at(0);
  if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

  await db.update(schema.item_types).set(toUpdate).where(eq(schema.item_types.id, typeId));
  return new Response(JSON.stringify({ ok: true }));
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const token = cookies.get('auth-session');
  if (!token) return new Response('Unauthorized', { status: 401 });
  const { session, user } = await validateSessionToken(token);
  if (!session || !user) return new Response('Unauthorized', { status: 401 });

  const projectId = params.id;
  const typeId = params.typeId;
  if (!projectId || !typeId) return new Response('Missing id', { status: 400 });

  const proj = await db.select().from(schema.project).where(eq(schema.project.id, projectId));
  const p = proj.at(0);
  if (!p || p.ownerId !== user.id) return new Response('Forbidden', { status: 403 });

  await db.delete(schema.item_types).where(eq(schema.item_types.id, typeId));
  return new Response(null, { status: 204 });
};
