import { z } from 'zod';

export const DeleteResponseSchema = z.object({
	deleted: z.boolean().describe('True if the resource was successfully deleted'),
});
