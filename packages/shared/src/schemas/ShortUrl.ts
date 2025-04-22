import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

export const ShortCodeSchema = z.string().max(5);

export const ShortUrlSchema = AbstractEntitySchema.extend({
	shortCode: ShortCodeSchema,
	destinationUrl: z.string().url().nullable(),
	createdBy: z.string(),
});

export type TShortUrl = z.infer<typeof ShortUrlSchema>;
