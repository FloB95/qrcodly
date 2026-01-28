import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

/**
 * Configuration for what to display on the shared QR code page.
 */
export const QrCodeShareConfigSchema = z.object({
	showName: z.boolean().default(true),
	showDownloadButton: z.boolean().default(true),
});

export type TQrCodeShareConfig = z.infer<typeof QrCodeShareConfigSchema>;

/**
 * Schema for QR code share entity.
 */
export const QrCodeShareSchema = AbstractEntitySchema.extend({
	qrCodeId: z.uuid(),
	shareToken: z.uuid(),
	config: QrCodeShareConfigSchema,
	isActive: z.boolean(),
	createdBy: z.string(),
});

export type TQrCodeShare = z.infer<typeof QrCodeShareSchema>;
