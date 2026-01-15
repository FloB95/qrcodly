import { SignedIn, SignInButton } from '@clerk/nextjs';
import React from 'react';
import { Button } from '../ui/button';
import { CheckoutButton } from '@clerk/nextjs/experimental';
import { UserBillingBtn } from './UserBillingBtn';
import { env } from '@/env';

export const ProCTA = ({
	locale,
	isAuthenticated,
	hasProPlan,
	planPeriod,
}: {
	locale: string;
	isAuthenticated: boolean;
	hasProPlan: boolean;
	planPeriod: 'month' | 'annual';
}) => {
	if (!isAuthenticated) {
		return (
			<SignInButton forceRedirectUrl={`/${locale}/plans`}>
				<Button variant="secondary">Upgrade to Pro</Button>
			</SignInButton>
		);
	}

	if (!hasProPlan) {
		return (
			<SignedIn>
				<CheckoutButton planId={env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID} planPeriod={planPeriod}>
					<Button variant="secondary">Upgrade to Pro</Button>
				</CheckoutButton>
			</SignedIn>
		);
	}

	return <UserBillingBtn />;
};
