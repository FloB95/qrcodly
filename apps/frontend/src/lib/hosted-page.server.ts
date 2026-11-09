import { cache } from 'react';
import { headers } from 'next/headers';
import type { TPublicHostedPageResponseDto } from '@shared/schemas';
import { env } from '@/env';
import { getPublicHostedPage } from '@/lib/api/hosted-page';
import { serverApiUrl } from '@/lib/server-api-url';
import { scannerIpFrom } from '@/lib/scanner-ip';
import { servesPageAt } from '@/lib/hosts';

/**
 * One lookup per request, shared by the metadata and the page. The internal key lets the backend
 * rate-limit each visitor instead of putting every scan on this server's address.
 */
export const loadHostedPage = cache(async (shortCode: string) => {
	const requestHeaders = await headers();
	return getPublicHostedPage(shortCode, serverApiUrl(), {
		'x-internal-api-key': env.INTERNAL_API_SECRET,
		'x-scanner-ip': scannerIpFrom(requestHeaders),
	});
});

/**
 * A page renders only at its address, the short URL in its QR code (for a customer domain also on
 * the brand host, where Cloudflare sends those visitors): never on another customer's domain, where
 * it would borrow that customer's name. The scan middleware redirects other hosts there; this
 * guards the page route itself.
 */
export async function isServedOnThisHost(page: TPublicHostedPageResponseDto): Promise<boolean> {
	// phones on the local network reach the dev server by IP
	if (env.NODE_ENV === 'development') return true;
	return servesPageAt(page.url, (await headers()).get('host'));
}
