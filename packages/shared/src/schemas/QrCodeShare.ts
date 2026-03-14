import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

/**
 * Configuration for what to display on the shared QR code page.
 */
export const QrCodeShareConfigSchema = z.object({
	showName: z
		.boolean()
		.default(true)
		.describe('Whether to display the QR code name on the public share page'),
	showDownloadButton: z
		.boolean()
		.default(true)
		.describe('Whether to show a download button on the public share page'),
});

export type TQrCodeShareConfig = z.infer<typeof QrCodeShareConfigSchema>;

/**
 * Schema for QR code share entity.
 */
export const QrCodeShareSchema = AbstractEntitySchema.extend({
	qrCodeId: z.uuid().describe('ID of the QR code being shared'),
	shareToken: z.uuid().describe('Unique token used in the public share URL'),
	config: QrCodeShareConfigSchema.describe('Display configuration for the public share page'),
	isActive: z.boolean().describe('Whether the share link is currently active'),
	createdBy: z.string().describe('User ID of the share link owner'),
});

export type TQrCodeShare = z.infer<typeof QrCodeShareSchema>;
