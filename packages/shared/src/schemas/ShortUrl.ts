import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

export const ShortCodeSchema = z.string().max(5);

export const ShortUrlSchema = AbstractEntitySchema.extend({
	shortCode: ShortCodeSchema,
	destinationUrl: z.url().nullable(),
	qrCodeId: z.uuid().nullable(),
	customDomainId: z.uuid().nullable().default(null),
	isActive: z.boolean(),
	createdBy: z.string(),
	deletedAt: z
		.preprocess((arg) => {
			if (arg instanceof Date) return arg.toISOString();
			return arg;
		}, z.iso.datetime().nullable())
		.default(null),
});

export type TShortUrl = z.infer<typeof ShortUrlSchema>;
