import { clerkMiddleware } from '@clerk/nextjs/server';
import { Logger } from 'next-axiom';
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { processAnalyticsAndRedirect } from './middlewares/process-analytics-and-redirect.middleware';
import createMiddleware from 'next-intl/middleware';
import { routing, signInPath, signUpPath, SUPPORTED_LANGUAGES } from './i18n/routing';
import { env } from '@/env';
import { brandHost, shortUrlHost } from '@/lib/hosts';

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Matches locale-prefixed paths to non-translated routes (docs only)
const localePrefix = SUPPORTED_LANGUAGES.filter((l) => l !== 'en').join('|');
const localePrefixedNonTranslatedRoute = new RegExp(`^/(${localePrefix})/(docs)(/.*)?$`);

// Short URL scan pattern — system 5-char codes or 3–50-char custom slugs.
// Allowed: lowercase letters, digits, hyphens (no leading/trailing hyphen).
const scanPattern = /^\/u\/(?:[a-z0-9]{5}|[a-z0-9][a-z0-9-]{1,48}[a-z0-9])$/;

// A document of a hosted page, served under the page's own address by a route handler.
const hostedFilePattern =
	/^\/u\/(?:[a-z0-9]{5}|[a-z0-9][a-z0-9-]{1,48}[a-z0-9])\/file\/[A-Za-z0-9_-]{1,64}$/;

/** Files of hosted pages skip Clerk and next-intl on every host, the short domain included. */
function hostedFileResponse() {
	const response = NextResponse.next();
	response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
	return response;
}

// The dedicated redirect domain — only when configured AND distinct from the brand domain.
// On this host we serve short-URL redirects (/u/<code>) and nothing else: every other path
// is 301'd to the brand domain, so no app/marketing content lives on the sacrificial domain
// and a Safe-Browsing flag there can never touch the brand.
const redirectOnlyHost = shortUrlHost && shortUrlHost !== brandHost ? shortUrlHost : null;

/** Run the scan/redirect flow and tag the response noindex (shared by both hosts). */
function scanResponse(req: NextRequest) {
	return processAnalyticsAndRedirect(req).then((response) => {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
		return response;
	});
}

// auth().redirectToSignIn() goes to our auth pages, in the language of the requested page
const clerkOptions = (req: NextRequest) => {
	const locale = req.nextUrl.pathname.split('/')[1];
	return { signInUrl: signInPath(locale), signUpUrl: signUpPath(locale) };
};

// Auth checks live in the protected layouts (resource-based, see dashboard/layout.tsx);
// clerkMiddleware only provides the auth context here.
const clerkHandler = clerkMiddleware(async (_auth, req, event) => {
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

	// Internationalization Middleware (exclude sitemap & api)
	if (
		!pathname.startsWith('/api') &&
		!pathname.startsWith('/monitoring') &&
		!pathname.startsWith('/docs') &&
		!pathname.startsWith('/ingest') &&
		!pathname.startsWith('/qr/')
	) {
		const intlResponse = intlMiddleware(req);
		if (intlResponse) {
			return intlResponse;
		}
	}

	return NextResponse.next();
}, clerkOptions);

export default function middleware(req: NextRequest, event: NextFetchEvent) {
	const { pathname, search } = new URL(req.url);

	// .well-known paths bypass all middleware (MCP registry auth, etc.)
	if (pathname.startsWith('/.well-known/')) {
		return NextResponse.next();
	}

	// Dedicated redirect domain: serve only short-URL redirects; 301 everything else to the
	// brand domain (same path) so the sacrificial domain never renders app/marketing content.
	// (_next/static assets bypass middleware via the matcher, so the /disabled page still works.)
	if (redirectOnlyHost) {
		const reqHost = ((req.headers.get('host') ?? '').split(':')[0] ?? '').replace(/^www\./, '');
		if (reqHost === redirectOnlyHost) {
			if (scanPattern.test(pathname)) return scanResponse(req);
			if (hostedFilePattern.test(pathname)) return hostedFileResponse();
			return NextResponse.redirect(new URL(pathname + search, env.NEXT_PUBLIC_FRONTEND_URL), 301);
		}
	}

	// Scan routes bypass Clerk entirely — no auth needed.
	// Tag /u/* responses noindex so phishing/abuse short URLs cannot be picked
	// up by search engines even when linked externally (stronger than robots.txt).
	if (scanPattern.test(pathname)) {
		return scanResponse(req);
	}

	if (hostedFilePattern.test(pathname)) {
		return hostedFileResponse();
	}

	return clerkHandler(req, event);
}

export const config = {
	matcher: [
		'/((?!_next|_vercel|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|docx?|xlsx?|zip|webmanifest)).*)',
		'/',
		'/(api|trpc)(.*)',
	],
};
