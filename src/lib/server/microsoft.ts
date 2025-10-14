import { MicrosoftEntraId } from 'arctic';
import type { RequestEvent } from '@sveltejs/kit';

export function createMicrosoftOAuth(event: RequestEvent): MicrosoftEntraId {
	// These will come from environment variables in Cloudflare
	const clientId = event.platform?.env?.MICROSOFT_CLIENT_ID || '';
	const clientSecret = event.platform?.env?.MICROSOFT_CLIENT_SECRET || '';
	const redirectURI = event.platform?.env?.MICROSOFT_REDIRECT_URI || 'http://localhost:8787/login/microsoft/callback';
	
	return new MicrosoftEntraId(
		'common', // tenant - 'common' allows any Microsoft account, or use a specific tenant ID
		clientId,
		clientSecret,
		redirectURI
	);
}

export interface MicrosoftUser {
	id: string; // Microsoft user ID from Graph API
	displayName?: string;
	givenName?: string;
	surname?: string;
	userPrincipalName?: string;
	mail?: string;
}
