import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { Logger } from 'next-axiom';
import { NextResponse } from 'next/server';
import { processAnalyticsAndRedirect } from './middlewares/process-analytics-and-redirect.middleware';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { env } from './env';

const isProtectedRoute = createRouteMatcher(['(.*)/collection(.*)']);

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Extract the main domain from FRONTEND_URL (e.g., "qrcodly.de" from "https://www.qrcodly.de")
const getMainDomain = () => {
	try {
		const url = new URL(env.NEXT_PUBLIC_FRONTEND_URL);
		// Remove 'www.' prefix if present and get the domain
		return url.hostname.replace(/^www\./, '');
	} catch {
		return 'qrcodly.de';
	}
};

const mainDomain = getMainDomain();

// Check if the request is from a custom domain (not our main domain)
const isCustomDomain = (host: string): boolean => {
	if (!host) return false;
	const cleanHost = (host.split(':')[0] ?? '').toLowerCase(); // Remove port
	// It's a custom domain if it's not our main domain or www.main domain
	return cleanHost !== mainDomain && cleanHost !== `www.${mainDomain}`;
};

export default clerkMiddleware(async (auth, req, event) => {
	const pathname = new URL(req.url).pathname;
	const host = req.headers.get('host') || '';

	if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
		return NextResponse.next();
	}

	const logger = new Logger({ source: 'middleware' });
	logger.middleware(req);
	event.waitUntil(logger.flush());

	// Handle protected routes
	if (isProtectedRoute(req)) await auth.protect();

	// Handle short URL redirects
	// Pattern 1: Standard route /u/{shortCode} on main domain
	const standardUrlPattern = /^\/u\/[a-z0-9]{5}$/;
	if (standardUrlPattern.test(pathname)) {
		return await processAnalyticsAndRedirect(req);
	}

	// Pattern 2: Custom domain route /{shortCode} (root-level short code)
	// Only applies if host is a custom domain (not qrcodly.de)
	const customDomainUrlPattern = /^\/[a-z0-9]{5}$/;
	if (isCustomDomain(host) && customDomainUrlPattern.test(pathname)) {
		return await processAnalyticsAndRedirect(req, host);
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
		if (intlResponse) return intlResponse;
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
