import { QrCodeSchema, VCardInputSchema } from '@shared/schemas';
import { z } from 'zod';

export const BulkVCardCsvDto = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...VCardInputSchema.shape,
});

export type TBulkVCardCsvDto = z.infer<typeof BulkVCardCsvDto>;
