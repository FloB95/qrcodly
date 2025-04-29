import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { Logger } from 'next-axiom';
import { NextResponse } from 'next/server';
import { processAnalyticsAndRedirect } from './middlewares/process-analytics-and-redirect.middleware';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const isProtectedRoute = createRouteMatcher(['(.*)/collection(.*)']);

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware(async (auth, req, event) => {
	const logger = new Logger({ source: 'middleware' });
	logger.middleware(req);

	event.waitUntil(logger.flush());

	// Handle protected routes
	if (isProtectedRoute(req)) await auth.protect();

	// Handle analytics for specific routes
	const urlPattern = /^\/u\/[a-z0-9]{5}$/;
	if (urlPattern.test(new URL(req.url).pathname)) {
		return await processAnalyticsAndRedirect(req);
	}

	// Apply the next-intl middleware
	const intlResponse = intlMiddleware(req);
	if (intlResponse) {
		return intlResponse;
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
