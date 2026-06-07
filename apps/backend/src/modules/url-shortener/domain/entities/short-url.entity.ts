import { shortUrl, type TShortUrl } from '@qrcodly/db';

export {
	shortUrlRelations,
	type TShortUrl,
	type TShortUrlWithDomain,
	type TShortUrlWithDomainAndTags,
} from '@qrcodly/db';

// `customSlugKey` is a DB-generated VIRTUAL column; never written from app code.
export type TShortUrlInsert = Omit<TShortUrl, 'createdAt' | 'updatedAt' | 'customSlugKey'>;

export default shortUrl;
