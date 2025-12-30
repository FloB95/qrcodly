import { type TShortUrl } from '@/modules/url-shortener/domain/entities/short-url.entity';
import { type TQrCode, type TQrCodeContent } from '@shared/schemas';

export interface IShortUrlStrategy {
	appliesTo(content: TQrCodeContent): boolean;
	handle(qrCode: TQrCode): Promise<TShortUrl>;
}
