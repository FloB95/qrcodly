'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { env } from '@/env';
import { useUser } from '@clerk/nextjs';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	const { isSignedIn, user } = useUser();
	useEffect(() => {
		posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
			api_host: '/ingest',
			ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
			capture_pageview: false, // We capture pageviews manually
			capture_pageleave: true, // Enable pageleave capture
		});
	}, []);

	useEffect(() => {
		if (isSignedIn) {
			posthog.identify(user.id, {
				email: user?.primaryEmailAddress?.emailAddress,
				fullName: user?.fullName,
			});
		}
	}, [isSignedIn, user?.id]);

	return (
		<PHProvider client={posthog}>
			<SuspendedPostHogPageView />
			{children}
		</PHProvider>
	);
}

function PostHogPageView() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const posthog = usePostHog();

	useEffect(() => {
		if (pathname && posthog) {
			let url = window.origin + pathname;
			const search = searchParams.toString();
			if (search) {
				url += '?' + search;
			}
			posthog.capture('$pageview', { $current_url: url });
		}
	}, [pathname, searchParams, posthog]);

	return null;
}

function SuspendedPostHogPageView() {
	return (
		<Suspense fallback={null}>
			<PostHogPageView />
		</Suspense>
	);
}
