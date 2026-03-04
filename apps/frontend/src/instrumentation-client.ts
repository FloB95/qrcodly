'use client';

// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { env } from './env';

Sentry.init({
	enabled: process.env.NODE_ENV === 'production',
	dsn: env.NEXT_PUBLIC_SENTRY_DSN,
	environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,

	// Add optional integrations for additional features
	integrations: [Sentry.replayIntegration()],

	// Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
	tracesSampleRate: 1,

	// Define how likely Replay events are sampled.
	// This sets the sample rate to be 10%. You may want this to be 100% while
	// in development and sample at a lower rate in production
	replaysSessionSampleRate: 0.1,

	// Define how likely Replay events are sampled when an error occurs.
	replaysOnErrorSampleRate: 1.0,

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: false,

	// Filter out errors caused by browser extensions and third-party scripts
	beforeSend(event) {
		const errorMessage = event.exception?.values?.[0]?.value || '';

		// Filter out DOM manipulation errors caused by browser extensions
		// (Grammarly, translation tools, ad blockers, etc.)
		if (
			errorMessage.includes("Failed to execute 'removeChild' on 'Node'") ||
			errorMessage.includes("Failed to execute 'insertBefore' on 'Node'") ||
			errorMessage.includes("Failed to execute 'appendChild' on 'Node'") ||
			errorMessage.includes('The node to be removed is not a child of this node')
		) {
			return null;
		}

		// Filter out errors from browser extensions
		const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];
		const isFromExtension = frames.some(
			(frame) =>
				frame.filename?.includes('extension://') ||
				frame.filename?.includes('moz-extension://') ||
				frame.filename?.includes('chrome-extension://'),
		);
		if (isFromExtension) {
			return null;
		}

		return event;
	},
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
