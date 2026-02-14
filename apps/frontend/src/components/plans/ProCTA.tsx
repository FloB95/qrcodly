'use client';

import { SignedIn, SignInButton } from '@clerk/nextjs';
import { CheckoutButton, useSubscription } from '@clerk/nextjs/experimental';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import posthog from 'posthog-js';
import { Button } from '../ui/button';
import { toast } from '../ui/use-toast';
import { env } from '@/env';

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
	const pathname = usePathname();
	const { data } = useSubscription();

	const subscriptionItem = data?.subscriptionItems[0];
	const hasProPlan = subscriptionItem?.plan?.slug === 'pro';
	const isCanceled = hasProPlan && !!subscriptionItem?.canceledAt;

	const handleSubscriptionComplete = () => {
		posthog.capture('subscription:created');
		toast({
			title: t('subscriptionSuccess'),
		});
	};

	// Not authenticated - show sign in button
	if (!isAuthenticated) {
		return (
			<SignInButton forceRedirectUrl={`/${locale}/plans`}>
				<Button variant="secondary">{t('upgradeToPro')}</Button>
			</SignInButton>
		);
	}

	// Has Pro but canceled - show renew button
	if (isCanceled) {
		return (
			<SignedIn>
				<CheckoutButton
					planId={env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID}
					planPeriod={planPeriod}
					onSubscriptionComplete={handleSubscriptionComplete}
					newSubscriptionRedirectUrl={pathname}
				>
					<Button variant="secondary">{t('renewSubscription')}</Button>
				</CheckoutButton>
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
			<CheckoutButton
				planId={env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID}
				planPeriod={planPeriod}
				onSubscriptionComplete={handleSubscriptionComplete}
				newSubscriptionRedirectUrl={pathname}
			>
				<Button variant="secondary">{t('upgradeToPro')}</Button>
			</CheckoutButton>
		</SignedIn>
	);
};
