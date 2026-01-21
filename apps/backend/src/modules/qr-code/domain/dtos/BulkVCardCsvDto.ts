import { QrCodeSchema, VCardInputSchema } from '@shared/schemas';
import { z } from 'zod';

const { isDynamic: _, ...vCardShapeWithoutDynamic } = VCardInputSchema.shape;

export const BulkVCardCsvDto = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...vCardShapeWithoutDynamic,
	isDynamic: z.preprocess((value) => {
		if (value === '1' || value === 1) return true;
		if (value === '0' || value === 0) return false;
		return value;
	}, z.boolean().optional()),
});

export type TBulkVCardCsvDto = z.infer<typeof BulkVCardCsvDto>;
