import { z } from 'zod';

export const DeleteResponseSchema = z.object({
	deleted: z.boolean(),
});
