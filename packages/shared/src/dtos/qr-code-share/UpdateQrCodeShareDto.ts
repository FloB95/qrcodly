import { type z } from 'zod';
import { QrCodeShareConfigSchema } from '../../schemas/QrCodeShare';

/**
 * Schema for updating a QR code share link configuration.
 */
export const UpdateQrCodeShareDto = QrCodeShareConfigSchema.partial();

export type TUpdateQrCodeShareDto = z.infer<typeof UpdateQrCodeShareDto>;
