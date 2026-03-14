import { z } from 'zod';

/**
 * The base entity schema.
 */
export const AbstractEntitySchema = z.object({
	id: z.uuid().describe('Unique identifier (UUID v4)'),
	createdAt: z
		.preprocess((arg) => {
			if (arg instanceof Date) return arg.toISOString();
			return arg;
		}, z.iso.datetime())
		.describe('Timestamp when the resource was created (ISO 8601)'),

	updatedAt: z
		.preprocess((arg) => {
			if (arg instanceof Date) return arg.toISOString();
			return arg;
		}, z.iso.datetime().nullable())
		.describe('Timestamp when the resource was last updated (ISO 8601), or null if never updated'),
});
