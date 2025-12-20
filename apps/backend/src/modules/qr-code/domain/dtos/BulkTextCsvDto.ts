import { QrCodeSchema, TextInputSchema } from '@shared/schemas';
import { z } from 'zod';

export const BulkTextCsvDto = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	text: TextInputSchema,
});

export type TBulkTextCsvDto = z.infer<typeof BulkTextCsvDto>;
