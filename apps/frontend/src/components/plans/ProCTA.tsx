'use client';

import { SignedIn, SignInButton } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import posthog from 'posthog-js';
import { Button } from '../ui/button';
import { env } from '@/env';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useCreateCheckoutSession, useCreatePortalSession } from '@/lib/api/billing';

export const ProCTA = ({
	locale,
	isAuthenticated,
	planPeriod,
}: {
	locale: string;
	isAuthenticated: boolean;
	planPeriod: 'month' | 'annual';
}) => {
	const t = useTranslations('plans');
	const { hasProPlan, isCanceled } = useHasProPlan();
	const createCheckoutSession = useCreateCheckoutSession();
	const createPortalSession = useCreatePortalSession();

	const priceId =
		planPeriod === 'annual'
			? env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL
			: env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY;

	const handleUpgrade = () => {
		posthog.capture('subscription:checkout_started');
		createCheckoutSession.mutate({ priceId, locale });
	};

	// Not authenticated - show sign in button
	if (!isAuthenticated) {
		return (
			<SignInButton forceRedirectUrl={`/${locale}/plans`}>
				<Button variant="secondary">{t('upgradeToPro')}</Button>
			</SignInButton>
		);
	}

	// Has Pro but canceled - open portal to reactivate
	if (isCanceled) {
		return (
			<SignedIn>
				<Button
					variant="secondary"
					onClick={() => createPortalSession.mutate({ locale })}
					disabled={createPortalSession.isPending}
				>
					{t('renewSubscription')}
				</Button>
			</SignedIn>
		);
	}

	// Has active Pro subscription - show manage button
	if (hasProPlan) {
		return (
			<Button variant="secondary" asChild>
				<Link href={`/${locale}/dashboard/settings/billing`}>{t('manageSubscription')}</Link>
			</Button>
		);
	}

	// No subscription - show upgrade button
	return (
		<SignedIn>
			<Button
				variant="secondary"
				onClick={handleUpgrade}
				disabled={createCheckoutSession.isPending}
			>
				{t('upgradeToPro')}
			</Button>
		</SignedIn>
	);
};
