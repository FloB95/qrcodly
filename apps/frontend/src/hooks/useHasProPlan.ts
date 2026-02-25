'use client';

import { useSubscriptionStatus } from '@/lib/api/billing';

export function useHasProPlan() {
	const { data, isPending } = useSubscriptionStatus();
	const subscription = data?.subscription ?? null;
	const hasProPlan =
		subscription !== null &&
		(subscription.status === 'active' || subscription.status === 'trialing');
	const isCanceled = hasProPlan && subscription?.cancelAtPeriodEnd === true;

	return {
		hasProPlan,
		isCanceled,
		isLoading: isPending,
		subscription,
	};
}
