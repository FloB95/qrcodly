import { QrCodeSchema, WhatsAppInputSchema } from '@shared/schemas';
import { z } from 'zod';

export const BulkWhatsAppCsvDto = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...WhatsAppInputSchema.shape,
});

export type TBulkWhatsAppCsvDto = z.infer<typeof BulkWhatsAppCsvDto>;
