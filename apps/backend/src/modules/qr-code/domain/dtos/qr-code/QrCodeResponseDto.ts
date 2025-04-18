import { QrCodeSchema } from '../../schemas/QrCode';
import { type z } from 'zod';

export const QrCodeResponseDto = QrCodeSchema;
export type TQrCodeResponseDto = z.infer<typeof QrCodeResponseDto>;
