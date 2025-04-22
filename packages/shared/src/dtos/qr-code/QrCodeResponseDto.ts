import { type z } from 'zod';
import { QrCodeSchema } from '../../schemas/QrCode';
import { ShortUrlSchema } from '../../schemas/ShortUrl';
import { ShortUrlResponseDto } from '../url-shortener/ShortUrlResponseDto';

export const QrCodeResponseDto = QrCodeSchema;
export type TQrCodeResponseDto = z.infer<typeof QrCodeResponseDto>;

export const QrCodeWithRelationsResponseDto = QrCodeSchema.extend({
	shortUrl: ShortUrlResponseDto.nullable(),
});
export type TQrCodeWithRelationsResponseDto = z.infer<typeof QrCodeWithRelationsResponseDto>;
