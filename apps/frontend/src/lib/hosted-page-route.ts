import { NextResponse, type NextRequest } from 'next/server';

// next-intl reads the request locale from this header, which its own middleware sets
const LOCALE_HEADER = 'x-next-intl-locale';

/**
 * Hosted pages render outside the site layout (no trackers, no login). Visitors reach them by
 * rewrite only, from a scan of their short URL (/u/<code>); the path itself is internal.
 */
export function rewriteToHostedPage(req: NextRequest, locale: string, shortCode: string) {
	const headers = new Headers(req.headers);
	headers.set(LOCALE_HEADER, locale);
	return NextResponse.rewrite(new URL(`/hosted-page/${locale}/${shortCode}`, req.url), {
		request: { headers },
	});
}
