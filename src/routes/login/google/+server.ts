import { redirect } from '@sveltejs/kit';
import { createGoogleOAuth } from '$lib/server/google';
import { generateState, generateCodeVerifier } from 'arctic';
import type { RequestEvent } from '../$types';
import type { RequestHandler } from '../../projects/$types';

export const GET: RequestHandler = async (event) => {
	const google = createGoogleOAuth(event);
	const state = generateState();
	const codeVerifier = generateCodeVerifier();
	
	const url = google.createAuthorizationURL(state, codeVerifier, [
		'openid',
		'profile',
		'email'
	]);

	// Store state and code verifier in cookies for validation
	event.cookies.set('google_oauth_state', state, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: 'lax'
	});
	
	event.cookies.set('google_code_verifier', codeVerifier, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: 'lax'
	});

	return redirect(302, url.toString());
};
