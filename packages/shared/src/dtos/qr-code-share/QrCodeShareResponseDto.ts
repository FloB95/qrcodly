import { z } from 'zod';
import { QrCodeShareSchema, QrCodeShareConfigSchema } from '../../schemas/QrCodeShare';
import { QrCodeContent, QrCodeOptionsSchema } from '../../schemas/QrCode';

/**
 * Response DTO for QR code share operations (authenticated).
 */
export const QrCodeShareResponseDto = QrCodeShareSchema;
export type TQrCodeShareResponseDto = z.infer<typeof QrCodeShareResponseDto>;

/**
 * Response DTO for public shared QR code page (unauthenticated).
 * Fields are conditionally included based on share config.
 */
export const PublicSharedQrCodeResponseDto = z.object({
	name: z.string().nullable(),
	content: QrCodeContent.nullable(),
	config: QrCodeOptionsSchema,
	shareConfig: QrCodeShareConfigSchema,
	previewImage: z.string().nullable(),
	qrCodeData: z.string().nullable(),
});

export type TPublicSharedQrCodeResponseDto = z.infer<typeof PublicSharedQrCodeResponseDto>;
