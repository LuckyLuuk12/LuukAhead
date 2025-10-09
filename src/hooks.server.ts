import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { database } from '$lib/server/db';

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const { db } = await database(event);
		const { session, user } = await auth.validateSessionToken(db, sessionToken);

		if (session) {
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} else {
			auth.deleteSessionTokenCookie(event);
		}

		event.locals.user = user;
		event.locals.session = session;
	}

	// Protected routes - require authentication
	const pathname = event.url.pathname;
	const isPublicRoute = 
		pathname === '/' || 
		pathname.startsWith('/login') ||
		pathname.startsWith('/api/'); // Allow API routes to handle their own auth

	if (!isPublicRoute && !event.locals.user) {
		throw redirect(302, '/login');
	}

	return resolve(event);
};

export const handle: Handle = handleAuth;
