import { z } from 'zod';
import { QrCodeSchema } from '../../schemas/QrCode';
import { validateContentHttpUrls, validateHostedPageContent } from './validateContentHttpUrls';

export const UpdateQrCodeDto = QrCodeSchema.pick({
	name: true,
	content: true,
	config: true,
})
	.partial()
	.superRefine((data, ctx) => {
		validateContentHttpUrls(data.content, ctx);
		validateHostedPageContent(data.content, ctx);
	});

export type TUpdateQrCodeDto = z.infer<typeof UpdateQrCodeDto>;
