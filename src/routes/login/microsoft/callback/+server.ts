import { redirect, type RequestHandler } from '@sveltejs/kit';
import { createMicrosoftOAuth, type MicrosoftUser } from '$lib/server/microsoft';
import { database } from '$lib/server/db';
import * as auth from '$lib/server/auth';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encodeBase32LowerCase } from '@oslojs/encoding';

export const GET: RequestHandler = async (event) => {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('microsoft_oauth_state');
	const codeVerifier = event.cookies.get('microsoft_code_verifier');

	if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
		return new Response('Invalid OAuth state', { status: 400 });
	}

	try {
		const microsoft = createMicrosoftOAuth(event);
		const { db } = await database(event);

		// Exchange code for access token
		const tokens = await microsoft.validateAuthorizationCode(code, codeVerifier);
		
		// Fetch user info from Microsoft
		const response = await fetch('https://graph.microsoft.com/v1.0/me', {
			headers: {
				Authorization: `Bearer ${tokens.accessToken()}`
			}
		});
		
		if (!response.ok) {
			console.error('Graph API error:', response.status, response.statusText);
			const errorText = await response.text();
			console.error('Error details:', errorText);
			throw new Error(`Graph API returned ${response.status}`);
		}
		
		const msUser: MicrosoftUser = await response.json();
		
		// Log the response to debug
		console.log('Microsoft Graph API response:', JSON.stringify(msUser, null, 2));
		
		// Microsoft Graph API returns 'id' not 'sub'
		const microsoftId = msUser.id;
		const email = msUser.mail || msUser.userPrincipalName;
		const displayName = msUser.displayName || msUser.givenName || 'User';
		
		console.log('Extracted values:', { microsoftId, email, displayName });

		// Check if user exists by Microsoft ID
		let existingUser = await db
			.select()
			.from(table.user)
			.where(eq(table.user.microsoftId, microsoftId))
			.then((rows) => rows[0]);

		// If not, check by email/username (use email prefix as username)
		if (!existingUser && email) {
			const username = email.split('@')[0];
			existingUser = await db
				.select()
				.from(table.user)
				.where(eq(table.user.username, username))
				.then((rows) => rows[0]);
		}

		let userId: string;

		if (existingUser) {
			// Update existing user with Microsoft ID if not set
			if (!existingUser.microsoftId) {
				await db
					.update(table.user)
					.set({ microsoftId: microsoftId })
					.where(eq(table.user.id, existingUser.id));
			}
			userId = existingUser.id;
		} else {
			// Create new user
			userId = generateUserId();
			const username = email?.split('@')[0] || displayName.toLowerCase().replace(/\s+/g, '_') || 'user';
			
			await db.insert(table.user).values({
				id: userId,
				username,
				passwordHash: null, // No password for OAuth users
				googleId: null,
				microsoftId: microsoftId
			});
		}

		// Create session
		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(db, sessionToken, userId);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		// Clear OAuth state cookies
		event.cookies.delete('microsoft_oauth_state', { path: '/' });
		event.cookies.delete('microsoft_code_verifier', { path: '/' });

		return redirect(302, '/projects');
	} catch (error) {
		console.error('Microsoft OAuth error:', error);
		return redirect(302, '/login?error=oauth_failed');
	}
};

function generateUserId() {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase32LowerCase(bytes);
	return id;
}
