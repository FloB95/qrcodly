// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { env } from '@/env';
import * as Sentry from '@sentry/nextjs';

Sentry.init({
	enabled: env.NODE_ENV === 'production',
	dsn: env.NEXT_PUBLIC_SENTRY_DSN,

	// Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
	tracesSampleRate: 1,

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: false,

	// Filter out noise from bot traffic hitting non-existent routes
	beforeSend(event) {
		const message = event.exception?.values?.[0]?.value || '';

		// Ignore FormData parse errors from bots probing non-existent API routes
		if (message.includes('Failed to parse body as FormData')) {
			return null;
		}

		return event;
	},
});
