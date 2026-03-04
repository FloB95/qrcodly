import { z } from 'zod';
import { QrCodeSchema } from '../../schemas/QrCode';
import { ShortUrlResponseDto } from '../url-shortener/ShortUrlResponseDto';
import { TagResponseDto } from '../tag/TagResponseDto';

export const QrCodeResponseDto = QrCodeSchema;
export type TQrCodeResponseDto = z.infer<typeof QrCodeResponseDto>;

export const QrCodeWithRelationsResponseDto = QrCodeSchema.extend({
	shortUrl: ShortUrlResponseDto.nullable(),
	tags: z.array(TagResponseDto).default([]),
});
export type TQrCodeWithRelationsResponseDto = z.infer<typeof QrCodeWithRelationsResponseDto>;
