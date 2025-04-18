import { type z } from 'zod';
import { QrCodeSchema } from '../../schemas/QrCode';

export const QrCodeResponseDto = QrCodeSchema;
export type TQrCodeResponseDto = z.infer<typeof QrCodeResponseDto>;
