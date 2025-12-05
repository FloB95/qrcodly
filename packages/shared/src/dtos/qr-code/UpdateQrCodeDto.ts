import { z } from 'zod';
import { QrCodeSchema } from '../../schemas/QrCode';

export const UpdateQrCodeDto = QrCodeSchema.pick({
	name: true,
	content: true,
	config: true,
}).partial();

export type TUpdateQrCodeDto = z.infer<typeof UpdateQrCodeDto>;
