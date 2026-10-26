import { QrCodeSchema, SmsInputSchema } from '@shared/schemas';
import { z } from 'zod';

export const BulkSmsCsvDto = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...SmsInputSchema.shape,
});

export type TBulkSmsCsvDto = z.infer<typeof BulkSmsCsvDto>;
