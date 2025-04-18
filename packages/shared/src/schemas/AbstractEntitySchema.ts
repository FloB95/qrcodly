import { z } from 'zod';

/**
 * The base entity schema.
 */
export const AbstractEntitySchema = z.object({
	id: z.string().uuid(),
	createdAt: z.date(),
	updatedAt: z.date().nullable(),
});
