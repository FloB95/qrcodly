import { z } from 'zod';
import { QrCodeSchema } from '../../schemas/QrCode';

export const CreateQrCodeDto = QrCodeSchema.pick({
	name: true,
	config: true,
	content: true,
});

export type TCreateQrCodeDto = z.infer<typeof CreateQrCodeDto>;

export type TCreateQrCodeResponseDto = {
	success: boolean;
	isStored: boolean;
	qrCodeId: string;
};
