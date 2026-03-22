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
		if (!env.NEXT_PUBLIC_POSTHOG_KEY || !env.NEXT_PUBLIC_POSTHOG_HOST) return;

		posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
			api_host: 'https://ph.qrcodly.de',
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
	}, [isSignedIn, user?.id, user?.fullName, user?.primaryEmailAddress?.emailAddress]);

	// Google Ads: Registration conversion tracking
	useEffect(() => {
		if (!isSignedIn || !user?.id || !user?.createdAt) return;

		const storageKey = `gtag_registration_tracked_${user.id}`;
		if (localStorage.getItem(storageKey)) return;

		const isNewUser = Date.now() - new Date(user.createdAt).getTime() < 5 * 60_000;
		if (isNewUser && typeof window.gtag === 'function') {
			window.gtag('event', 'conversion', {
				send_to: 'AW-10838865201/nuV5CNm-pY0cELHqr7Ao',
				value: 1.0,
				currency: 'EUR',
			});
		}

		localStorage.setItem(storageKey, '1');
	}, [isSignedIn, user?.id, user?.createdAt]);

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
