'use client';

import { Show, SignInButton } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import posthog from 'posthog-js';
import { Button } from '../ui/button';
import { env } from '@/env';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useCreateCheckoutSession, useOpenBillingPortal } from '@/lib/api/billing';

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
	const billingPortal = useOpenBillingPortal();

	const priceId =
		planPeriod === 'annual'
			? env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL
			: env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY;

	const handleUpgrade = () => {
		posthog.capture('subscription:checkout_started', { source: 'plans_page', period: planPeriod });
		createCheckoutSession.mutate({ priceId, locale });
	};

	// Not authenticated - carry the Pro intent through auth so users land in
	// checkout instead of on the dashboard after signing in/up
	if (!isAuthenticated) {
		return (
			<SignInButton
				forceRedirectUrl={`/${locale}/upgrade?period=${planPeriod}`}
				signUpForceRedirectUrl={`/${locale}/upgrade?period=${planPeriod}&signup=1`}
			>
				<Button variant="secondary">{t('upgradeToPro')}</Button>
			</SignInButton>
		);
	}

	// Has Pro but canceled - open portal to reactivate
	if (isCanceled) {
		return (
			<Show when="signed-in">
				<Button
					variant="secondary"
					onClick={() => billingPortal.open(locale)}
					disabled={billingPortal.isPending}
				>
					{t('renewSubscription')}
				</Button>
			</Show>
		);
	}

	// Has active Pro subscription - show manage button
	if (hasProPlan) {
		return (
			<Button variant="secondary" asChild>
				<Link href="/dashboard/settings/billing">{t('manageSubscription')}</Link>
			</Button>
		);
	}

	// No subscription - show upgrade button
	return (
		<Show when="signed-in">
			<Button
				variant="secondary"
				onClick={handleUpgrade}
				disabled={createCheckoutSession.isPending}
			>
				{t('upgradeToPro')}
			</Button>
		</Show>
	);
};
