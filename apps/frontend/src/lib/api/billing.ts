'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';

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
			window.open(data.url, '_blank', 'noopener,noreferrer');
		},
	});
}

export function useCreatePortalSession() {
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (
			params: { locale?: string; returnUrl?: string } | void,
		): Promise<{ url: string }> => {
			const token = await getToken();
			if (!token) {
				throw new Error('Missing auth token');
			}
			return apiRequest<{ url: string }>('/billing/portal-session', {
				method: 'POST',
				body: JSON.stringify(params || {}),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: (data) => {
			window.open(data.url, '_blank', 'noopener,noreferrer');
		},
	});
}
