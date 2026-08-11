'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, openDeferredWindow, type DeferredWindow } from '@/lib/utils';

export const billingQueryKeys = {
	subscription: ['subscription'] as const,
};

export interface SubscriptionStatus {
	subscription: {
		status: string;
		stripePriceId: string;
		currentPeriodEnd: string;
		cancelAtPeriodEnd: boolean;
	} | null;
	hasStripeCustomer: boolean;
}

export function useSubscriptionStatus() {
	const { getToken, isLoaded, isSignedIn, userId } = useAuth();

	return useQuery({
		queryKey: [...billingQueryKeys.subscription, userId],
		enabled: isLoaded && !!isSignedIn,
		queryFn: async (): Promise<SubscriptionStatus> => {
			const token = await getToken();
			if (!token) {
				throw new Error('Missing auth token');
			}
			return apiRequest<SubscriptionStatus>('/billing/subscription', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 60 * 1000, // 1 minute
		retry: 2,
	});
}

export function useCreateCheckoutSession() {
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (params: {
			priceId: string;
			locale?: string;
			successUrl?: string;
			cancelUrl?: string;
		}): Promise<{ url: string }> => {
			const token = await getToken();
			if (!token) {
				throw new Error('Missing auth token');
			}
			return apiRequest<{ url: string }>('/billing/checkout-session', {
				method: 'POST',
				body: JSON.stringify(params),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: (data) => {
			// Same-tab redirect keeps ad-click attribution and returns the user
			// to ?checkout=success in the tab where tracking is armed
			window.location.href = data.url;
		},
	});
}

type PortalSessionParams = { locale?: string; target?: DeferredWindow };

export function useCreatePortalSession() {
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (params: PortalSessionParams | void): Promise<{ url: string }> => {
			const token = await getToken();
			if (!token) {
				throw new Error('Missing auth token');
			}
			return apiRequest<{ url: string }>('/billing/portal-session', {
				method: 'POST',
				body: JSON.stringify({ locale: params ? params.locale : undefined }),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: (data, variables) => {
			const target = variables ? variables.target : undefined;
			if (target) {
				target.resolve(data.url);
			} else {
				window.location.href = data.url;
			}
		},
		onError: (_error, variables) => {
			if (variables && variables.target) variables.target.abort();
		},
	});
}

/**
 * Opens the Stripe billing portal in a new tab.
 *
 * The portal is a dead end — it has no link back into the app — so sending the current tab there
 * strands the user. Checkout is different and stays in the same tab, because it returns via its
 * success URL and that keeps ad-click attribution intact.
 */
export function useOpenBillingPortal() {
	const createPortalSession = useCreatePortalSession();

	return {
		open: (locale?: string) => {
			createPortalSession.mutate({ locale, target: openDeferredWindow() });
		},
		isPending: createPortalSession.isPending,
	};
}
