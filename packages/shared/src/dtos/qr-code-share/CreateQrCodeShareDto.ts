import { type z } from 'zod';
import { QrCodeShareConfigSchema } from '../../schemas/QrCodeShare';

/**
 * Schema for creating a QR code share link.
 * Config is optional - defaults will be applied if not provided.
 */
export const CreateQrCodeShareDto = QrCodeShareConfigSchema.partial().optional();

export type TCreateQrCodeShareDto = z.infer<typeof CreateQrCodeShareDto>;
