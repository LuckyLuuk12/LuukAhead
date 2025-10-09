import { encodeBase32LowerCase } from '@oslojs/encoding';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { database } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

// --- PBKDF2 helpers ---
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEYLEN = 32;

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveBits']
	);
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt as BufferSource,
			iterations: PBKDF2_ITERATIONS,
			hash: PBKDF2_HASH
		},
		key,
		PBKDF2_KEYLEN * 8
	);
	// Store as: salt:hash (both base64)
	return `${btoa(String.fromCharCode(...salt))}:${btoa(String.fromCharCode(...new Uint8Array(derivedBits)))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltB64, hashB64] = stored.split(':');
	if (!saltB64 || !hashB64) return false;
	const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
	const hash = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0));
	const testHash = await hashPassword(password, salt);
	const [, testHashB64] = testHash.split(':');
	return hashB64 === testHashB64;
}

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/projects');
	}
	
	// Check if Google OAuth is configured
	const googleOAuthEnabled = !!(
		event.platform?.env?.GOOGLE_CLIENT_ID &&
		event.platform?.env?.GOOGLE_CLIENT_SECRET &&
		event.platform?.env?.GOOGLE_REDIRECT_URI
	);
	
	return {
		googleOAuthEnabled
	};
};

export const actions: Actions = {
	login: async (event) => {
		const { db } = await database(event);
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, { message: 'Invalid username' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password' });
		}

		const results = await db.select().from(table.user).where(eq(table.user.username, username));

		const existingUser = results.at(0);
		if (!existingUser) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		if (!existingUser.passwordHash) {
			return fail(400, { message: 'This account has no password set.' });
		}

		const validPassword = await verifyPassword(password as string, existingUser.passwordHash);
		if (!validPassword) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(db, sessionToken, existingUser.id);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		console.log('User logged in:', existingUser.username);
		return redirect(302, '/projects');
	},
	register: async (event) => {
		const { db } = await database(event);
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, { message: 'Invalid username' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password' });
		}

		const userId = generateUserId();
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const passwordHash = await hashPassword(password as string, salt);

		try {
			await db.insert(table.user).values({ id: userId, username, passwordHash });

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(db, sessionToken, userId);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} catch (e) {
			console.error('Error during registration:', e);
			return fail(500, { message: 'An error has occurred' });
		}
		return redirect(302, '/projects');
	}
};

function generateUserId() {
    const bytes = crypto.getRandomValues(new Uint8Array(15));
    const id = encodeBase32LowerCase(bytes);
    return id;
}

function validateUsername(username: unknown): username is string {
    return (
        typeof username === 'string' &&
        username.length >= 3 &&
        username.length <= 31 &&
        /^[A-Za-z0-9_-]+$/.test(username)
    );
}

function validatePassword(password: unknown): password is string {
    return (
        typeof password === 'string' &&
        password.length >= 6 &&
        password.length <= 255
    );
}
