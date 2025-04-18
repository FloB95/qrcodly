import { z } from 'zod';

/**
 * The base entity schema.
 */
export const BaseEntitySchema = z.object({
	id: z.string().uuid(),
	createdAt: z.date(),
	updatedAt: z.date().nullable(),
});
