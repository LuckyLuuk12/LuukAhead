import { redirect } from '@sveltejs/kit';
import { createGoogleOAuth, type GoogleUser } from '$lib/server/google';
import { database } from '$lib/server/db';
import * as auth from '$lib/server/auth';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import type { RequestHandler } from '../../../projects/$types';

export const GET: RequestHandler = async (event) => {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('google_oauth_state');
	const codeVerifier = event.cookies.get('google_code_verifier');

	if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
		return new Response('Invalid OAuth state', { status: 400 });
	}

	try {
		const google = createGoogleOAuth(event);
		const { db } = await database(event);

		// Exchange code for access token
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);
		
		// Fetch user info from Google
		const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: {
				Authorization: `Bearer ${tokens.accessToken()}`
			}
		});
		
		const googleUser: GoogleUser = await response.json();

		// Check if user exists by Google ID
		let existingUser = await db
			.select()
			.from(table.user)
			.where(eq(table.user.googleId, googleUser.sub))
			.then((rows) => rows[0]);

		// If not, check by email/username (use email prefix as username)
		if (!existingUser) {
			const username = googleUser.email.split('@')[0];
			existingUser = await db
				.select()
				.from(table.user)
				.where(eq(table.user.username, username))
				.then((rows) => rows[0]);
		}

		let userId: string;

		if (existingUser) {
			// Update existing user with Google ID if not set
			if (!existingUser.googleId) {
				await db
					.update(table.user)
					.set({ googleId: googleUser.sub })
					.where(eq(table.user.id, existingUser.id));
			}
			userId = existingUser.id;
		} else {
			// Create new user
			userId = generateUserId();
			const username = googleUser.email.split('@')[0];
			
			await db.insert(table.user).values({
				id: userId,
				username,
				passwordHash: null, // No password for OAuth users
				googleId: googleUser.sub
			});
		}

		// Create session
		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(db, sessionToken, userId);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		// Clear OAuth state cookies
		event.cookies.delete('google_oauth_state', { path: '/' });
		event.cookies.delete('google_code_verifier', { path: '/' });

		return redirect(302, '/projects');
	} catch (error) {
		console.error('Google OAuth error:', error);
		return redirect(302, '/login?error=oauth_failed');
	}
};

function generateUserId() {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase32LowerCase(bytes);
	return id;
}
