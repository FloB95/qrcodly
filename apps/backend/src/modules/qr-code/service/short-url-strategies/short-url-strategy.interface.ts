import { type TShortUrl } from '@/modules/url-shortener/domain/entities/short-url.entity';
import { type TQrCode, type TQrCodeContent } from '@shared/schemas';
import { type TUser } from '@/core/domain/schema/UserSchema';

export interface IShortUrlStrategyContext {
	customSlug?: string | null;
	/**
	 * Override for the linked short URL's customDomainId. When undefined the
	 * strategy falls back to the user's default custom domain. `null` means
	 * the system domain explicitly. Validated against ownership in the use case.
	 */
	customDomainId?: string | null;
	user?: TUser;
}

export interface IShortUrlStrategy {
	appliesTo(content: TQrCodeContent): boolean;
	handle(qrCode: TQrCode, ctx?: IShortUrlStrategyContext): Promise<TShortUrl>;
}
