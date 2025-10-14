import { redirect, type RequestHandler } from '@sveltejs/kit';
import { createMicrosoftOAuth } from '$lib/server/microsoft';
import { generateState, generateCodeVerifier } from 'arctic';

export const GET: RequestHandler = async (event) => {
	const microsoft = createMicrosoftOAuth(event);
	const state = generateState();
	const codeVerifier = generateCodeVerifier();
	
	// Microsoft Graph API scopes - note the format is different from OpenID scopes
	const url = microsoft.createAuthorizationURL(state, codeVerifier, [
		'User.Read' // Allows reading the signed-in user's profile
	]);

	// Store state and code verifier in cookies for validation
	event.cookies.set('microsoft_oauth_state', state, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: 'lax'
	});
	
	event.cookies.set('microsoft_code_verifier', codeVerifier, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: 'lax'
	});

	return redirect(302, url.toString());
};
