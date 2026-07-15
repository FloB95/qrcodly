import { z } from 'zod';
import { ShortUrlWithCustomDomainResponseDto } from './ShortUrlResponseDto';

/**
 * Reserved short URL response: the standard short URL payload plus the fully-built short URL
 * string (the dedicated redirect domain or the short URL's custom domain). This lets clients that
 * render a preview before the destination is known — e.g. the InDesign plugin — use the
 * server-authoritative short URL instead of hardcoding a domain.
 */
export const ReservedShortUrlResponseDto = ShortUrlWithCustomDomainResponseDto.extend({
	shortUrl: z
		.string()
		.describe('Fully-built short URL for the reserved code (redirect domain or custom domain).'),
});
export type TReservedShortUrlResponseDto = z.infer<typeof ReservedShortUrlResponseDto>;
