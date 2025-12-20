import { QrCodeSchema, WifiInputSchema } from '@shared/schemas';
import { z } from 'zod';

export const BulkWifiCsvDto = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...WifiInputSchema.shape,
});

export type TBulkWifiCsvDto = z.infer<typeof BulkWifiCsvDto>;
