import { QrCodeSchema, UrlInputSchema } from '@shared/schemas';
import { z } from 'zod';

export const BulkUrlCsvDto = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...UrlInputSchema.pick({ url: true }).shape,
	isEditable: z.preprocess((value) => {
		if (value === '1' || value === 1) return true;
		if (value === '0' || value === 0) return false;
		return value;
	}, z.boolean().optional()),
});

export type TBulkUrlCsvDto = z.infer<typeof BulkUrlCsvDto>;
