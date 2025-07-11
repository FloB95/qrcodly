import { z } from 'zod';
import { QrCodeSchema } from '../../schemas/QrCode';
import { ShortUrlResponseDto } from '../url-shortener/ShortUrlResponseDto';

export const QrCodeResponseDto = QrCodeSchema;
export type TQrCodeResponseDto = z.infer<typeof QrCodeResponseDto>;

export const QrCodeWithRelationsResponseDto = QrCodeSchema.extend({
	shortUrl: ShortUrlResponseDto.nullable(),
});
export type TQrCodeWithRelationsResponseDto = z.infer<typeof QrCodeWithRelationsResponseDto>;
