import { json, error, type RequestHandler } from '@sveltejs/kit';
import { database } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id: projectId } = event.params;
	const { order } = await event.request.json();

	if (!Array.isArray(order)) {
		throw error(400, 'order must be an array of IDs');
	}

	try {
		const { db } = await database(event);

		// Update the order for each item type
		for (let i = 0; i < order.length; i++) {
			const typeId = order[i];
			await db
				.update(table.item_types)
				.set({ order: i })
				.where(eq(table.item_types.id, typeId));
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error reordering item types:', err);
		throw error(500, 'Failed to reorder item types');
	}
};
