'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { env } from '@/env';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useCreateCheckoutSession } from '@/lib/api/billing';

/**
 * Interstitial that carries Pro intent through the auth flow: users who click
 * "Upgrade to Pro" while signed out land here after sign-in/sign-up and are
 * sent straight to Stripe checkout instead of the dashboard.
 */
function UpgradeRedirect() {
	const t = useTranslations('plans.checkoutRedirect');
	const locale = useLocale();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isLoaded, isSignedIn } = useAuth();
	const { hasProPlan, isLoading } = useHasProPlan();
	const createCheckoutSession = useCreateCheckoutSession();
	const startedRef = useRef(false);

	const period = searchParams.get('period') === 'month' ? 'month' : 'annual';
	const isNewSignup = searchParams.get('signup') === '1';
	const priceId =
		period === 'annual'
			? env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL
			: env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY;

	useEffect(() => {
		if (!isLoaded) return;
		if (!isSignedIn) {
			router.replace('/plans');
			return;
		}
		if (isLoading) return;
		if (hasProPlan) {
			router.replace('/dashboard/settings/billing');
			return;
		}
		if (startedRef.current) return;
		startedRef.current = true;

		// Pro-intent signups skip /signup-success, so fire the signup conversion here
		if (isNewSignup && typeof window.gtag === 'function') {
			window.gtag('event', 'conversion', {
				send_to: 'AW-10838865201/nuV5CNm-pY0cELHqr7Ao',
				value: 1.0,
				currency: 'EUR',
			});
		}

		posthog.capture('subscription:checkout_started', {
			source: isNewSignup ? 'signup_pro_intent' : 'signin_pro_intent',
			period,
		});
		createCheckoutSession.mutate({ priceId, locale });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoaded, isSignedIn, isLoading, hasProPlan, isNewSignup, period, priceId, locale]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
			<div
				className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"
				aria-hidden="true"
			/>
			<h1 className="mt-6 text-2xl font-semibold">{t('title')}</h1>
			<p className="mt-2 max-w-md text-slate-600">{t('description')}</p>
			{createCheckoutSession.isError && (
				<div className="mt-6 flex flex-col items-center gap-3">
					<Button onClick={() => createCheckoutSession.mutate({ priceId, locale })}>
						{t('cta')}
					</Button>
					<Link href="/plans" className="text-sm text-slate-500 underline underline-offset-2">
						{t('backToPlans')}
					</Link>
				</div>
			)}
		</div>
	);
}

export default function UpgradePage() {
	return (
		<Suspense fallback={null}>
			<UpgradeRedirect />
		</Suspense>
	);
}
