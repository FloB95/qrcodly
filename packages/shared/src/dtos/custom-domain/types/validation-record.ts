import { z } from 'zod';

/**
 * Validation record (TXT) from Cloudflare.
 */
export const ValidationRecordSchema = z.object({
	name: z.string(),
	value: z.string(),
});

export type TValidationRecord = z.infer<typeof ValidationRecordSchema>;
