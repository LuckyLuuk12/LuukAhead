import { D1Database } from '@cloudflare/workers-types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('$lib/server/auth').SessionValidationResult['user'];
			session: import('$lib/server/auth').SessionValidationResult['session']
		}
		interface Platform {
			env?: {
				D1: D1Database;
				GOOGLE_CLIENT_ID?: string;
				GOOGLE_CLIENT_SECRET?: string;
				GOOGLE_REDIRECT_URI?: string;
				MICROSOFT_CLIENT_ID?: string;
				MICROSOFT_CLIENT_SECRET?: string;
				MICROSOFT_REDIRECT_URI?: string;
			}
		}
	} // interface Error {}
	// interface Locals {}
} // interface PageData {}
// interface PageState {}

// interface Platform {}
export {};
