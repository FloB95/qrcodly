import { PhoneInputSchema, QrCodeSchema } from '@shared/schemas';
import { z } from 'zod';

export const BulkPhoneCsvDto = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...PhoneInputSchema.shape,
});

export type TBulkPhoneCsvDto = z.infer<typeof BulkPhoneCsvDto>;
