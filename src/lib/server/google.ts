import { Google } from 'arctic';
import type { RequestEvent } from '@sveltejs/kit';

export function createGoogleOAuth(event: RequestEvent): Google {
	// These will come from environment variables in Cloudflare
	const clientId = event.platform?.env?.GOOGLE_CLIENT_ID || '';
	const clientSecret = event.platform?.env?.GOOGLE_CLIENT_SECRET || '';
	const redirectURI = event.platform?.env?.GOOGLE_REDIRECT_URI || 'http://localhost:5173/login/google/callback';
	
	return new Google(clientId, clientSecret, redirectURI);
}

export interface GoogleUser {
	sub: string; // Google user ID
	name: string;
	email: string;
	picture: string;
	email_verified: boolean;
}
