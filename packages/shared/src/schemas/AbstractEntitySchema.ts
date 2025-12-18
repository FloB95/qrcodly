import { z } from 'zod';

/**
 * The base entity schema.
 */
export const AbstractEntitySchema = z.object({
	id: z.uuid(),
	createdAt: z.preprocess((arg) => {
		if (arg instanceof Date) return arg.toISOString();
		return arg;
	}, z.iso.datetime()),

	updatedAt: z.preprocess((arg) => {
		if (arg instanceof Date) return arg.toISOString();
		return arg;
	}, z.iso.datetime().nullable()),
});
