import { SignedIn, SignInButton } from '@clerk/nextjs';
import React from 'react';
import { Button } from '../ui/button';
import { CheckoutButton } from '@clerk/nextjs/experimental';
import { UserBillingBtn } from './UserBillingBtn';

export const ProCTA = ({
	locale,
	isAuthenticated,
	hasProPlan,
}: {
	locale: string;
	isAuthenticated: boolean;
	hasProPlan: boolean;
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
				{/* TODO make plan id and period dynamic */}
				<CheckoutButton planId="cplan_36wWRWdZoYZnRbidMwr5ArMALFD" planPeriod="month">
					<Button variant="secondary">Upgrade to Pro</Button>
				</CheckoutButton>
			</SignedIn>
		);
	}

	return <UserBillingBtn />;
};
