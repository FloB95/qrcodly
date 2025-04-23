import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { Logger } from 'next-axiom';
import { NextResponse } from 'next/server';
import { handleAnalytics } from './middlewares/analytics.middleware';

const isProtectedRoute = createRouteMatcher(['/collection(.*)']);

export default clerkMiddleware(async (auth, req, event) => {
	const logger = new Logger({ source: 'middleware' });
	logger.middleware(req);

	event.waitUntil(logger.flush());

	if (isProtectedRoute(req)) await auth.protect();

	const urlPattern = /^\/u\/[a-z0-9]{5}$/;
	if (urlPattern.test(new URL(req.url).pathname)) {
		return await handleAnalytics(req);
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		'/',
		'/(api|trpc)(.*)',
	],
};
