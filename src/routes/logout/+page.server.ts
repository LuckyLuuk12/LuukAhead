import * as auth from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { database } from '$lib/server/db';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		if (!event.locals.session) {
			return fail(401);
		}
		const { db } = await database(event);
		await auth.invalidateSession(db, event.locals.session.id);
		auth.deleteSessionTokenCookie(event);

		return redirect(302, '/login');
	}
};
