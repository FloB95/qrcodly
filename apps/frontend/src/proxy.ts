import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { Logger } from 'next-axiom';
import { NextResponse } from 'next/server';
import { processAnalyticsAndRedirect } from './middlewares/process-analytics-and-redirect.middleware';
import createMiddleware from 'next-intl/middleware';
import { routing, SUPPORTED_LANGUAGES } from './i18n/routing';

const isProtectedRoute = createRouteMatcher([
	'(.*)/dashboard(.*)',
	'(.*)/collection(.*)',
	'(.*)/settings(.*)',
]);

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Matches locale-prefixed paths to non-translated routes (docs, imprint, privacy-policy)
const localePrefix = SUPPORTED_LANGUAGES.filter((l) => l !== 'en').join('|');
const localePrefixedNonTranslatedRoute = new RegExp(
	`^/(${localePrefix})/(docs|imprint|privacy-policy)(/.*)?$`,
);

export default clerkMiddleware(async (auth, req, event) => {
	const pathname = new URL(req.url).pathname;

	if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
		return NextResponse.next();
	}

	// 301 redirect locale-prefixed non-translated routes (e.g. /de/docs/api → /docs/api)
	const localeMatch = pathname.match(localePrefixedNonTranslatedRoute);
	if (localeMatch) {
		const pathWithoutLocale = pathname.replace(`/${localeMatch[1]}`, '');
		const url = new URL(pathWithoutLocale, req.url);
		return NextResponse.redirect(url, 301);
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
			return intlResponse;
		}
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		'/((?!_next|_vercel|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		'/',
		'/(api|trpc)(.*)',
	],
};
