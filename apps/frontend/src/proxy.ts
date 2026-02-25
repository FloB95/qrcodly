import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { Logger } from 'next-axiom';
import { NextResponse, type NextRequest } from 'next/server';
import { processAnalyticsAndRedirect } from './middlewares/process-analytics-and-redirect.middleware';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const isProtectedRoute = createRouteMatcher([
	'(.*)/dashboard(.*)',
	'(.*)/collection(.*)',
	'(.*)/settings(.*)',
]);

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

function setRequestMetaCookie(response: NextResponse, req: NextRequest, pathname: string) {
	const ip =
		req.headers.get('cf-connecting-ip') ??
		req.headers.get('x-real-ip') ??
		req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'';
	const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'unknown';
	const scheme = req.headers.get('x-forwarded-proto') ?? 'https';

	response.cookies.set('__req_meta', JSON.stringify({ p: pathname, h: host, i: ip, s: scheme }), {
		httpOnly: true,
		sameSite: 'strict',
		maxAge: 10,
		path: '/',
	});
}

export default clerkMiddleware(async (auth, req, event) => {
	const pathname = new URL(req.url).pathname;

	if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
		const reqHeaders = new Headers(req.headers);
		reqHeaders.set('x-pathname', pathname);
		const resp = NextResponse.next({ request: { headers: reqHeaders } });
		setRequestMetaCookie(resp, req, pathname);
		return resp;
	}

	const logger = new Logger({ source: 'middleware' });
	logger.middleware(req);
	event.waitUntil(logger.flush());

	// Handle protected routes
	if (isProtectedRoute(req)) await auth.protect();

	// Handle analytics for specific routes
	const urlPattern = /^\/u\/[a-z0-9]{5}$/;
	if (urlPattern.test(pathname)) {
		return await processAnalyticsAndRedirect(req);
	}

	// Internationalization Middleware (exclude sitemap & api)
	if (
		!pathname.startsWith('/api') &&
		!pathname.startsWith('/umami.js') &&
		!pathname.startsWith('/monitoring') &&
		!pathname.startsWith('/docs') &&
		!pathname.startsWith('/ingest') &&
		!pathname.startsWith('/privacy-policy') &&
		!pathname.startsWith('/imprint') &&
		!pathname.startsWith('/qr/')
	) {
		const intlResponse = intlMiddleware(req);
		if (intlResponse) {
			// For redirects, return as-is (browser makes a new request where middleware runs again)
			if (intlResponse.headers.has('location')) {
				return intlResponse;
			}

			// Build merged request headers: original + intl middleware additions + x-pathname
			const reqHeaders = new Headers(req.headers);
			reqHeaders.set('x-pathname', pathname);

			// Merge any request header modifications set by the intl middleware
			// (Next.js uses x-middleware-override-headers + x-middleware-request-* internally)
			const overrideHeaders = intlResponse.headers.get('x-middleware-override-headers');
			if (overrideHeaders) {
				for (const key of overrideHeaders.split(',')) {
					const headerName = key.trim();
					const value = intlResponse.headers.get(`x-middleware-request-${headerName}`);
					if (value !== null) {
						reqHeaders.set(headerName, value);
					}
				}
			}

			const response = NextResponse.next({ request: { headers: reqHeaders } });

			// Copy non-middleware response headers (cookies, rewrites, etc.)
			// but skip x-middleware-override-headers and x-middleware-request-* since
			// we merged those into reqHeaders above to avoid overwriting our x-pathname
			intlResponse.headers.forEach((value, key) => {
				if (key !== 'x-middleware-override-headers' && !key.startsWith('x-middleware-request-')) {
					response.headers.set(key, value);
				}
			});

			setRequestMetaCookie(response, req, pathname);
			return response;
		}
	}

	const reqHeaders = new Headers(req.headers);
	reqHeaders.set('x-pathname', pathname);
	const resp = NextResponse.next({ request: { headers: reqHeaders } });
	setRequestMetaCookie(resp, req, pathname);
	return resp;
});

export const config = {
	matcher: [
		'/((?!_next|_vercel|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		'/',
		'/(api|trpc)(.*)',
	],
};
