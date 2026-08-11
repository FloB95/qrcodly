'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { customDomainQueryKeys } from '@/lib/api/custom-domain';
import { domainAddonQueryKeys } from './domain-addon.keys';
import type {
	TDomainAddonCancelResponseDto,
	TDomainAddonCheckoutResponseDto,
	TDomainAddonQuantityResponseDto,
	TDomainAddonQuantityPreviewDto,
	TDomainAddonResponseDto,
} from '@shared/schemas';

export { domainAddonQueryKeys };

const BASE_PATH = '/billing/domain-addon';

export function useDomainAddonQuery() {
	const { getToken, isLoaded, isSignedIn, userId } = useAuth();

	return useQuery({
		queryKey: [...domainAddonQueryKeys.addon, userId],
		enabled: isLoaded && !!isSignedIn,
		queryFn: async (): Promise<TDomainAddonResponseDto> => {
			const token = await getToken();
			if (!token) throw new Error('Missing auth token');

			return apiRequest<TDomainAddonResponseDto>(BASE_PATH, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 30 * 1000,
		retry: 2,
	});
}

/**
 * Invalidates both the add-on and the domain list: a slot change decides how many domains may be
 * enabled, so the table is stale the moment the add-on changes.
 */
function useAddonMutationInvalidation() {
	const queryClient = useQueryClient();

	return () => {
		void queryClient.invalidateQueries({ queryKey: domainAddonQueryKeys.addon });
		void queryClient.invalidateQueries({ queryKey: customDomainQueryKeys.list });
		void queryClient.invalidateQueries({ queryKey: customDomainQueryKeys.all });
	};
}

export function useCreateDomainAddonCheckout() {
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (params: {
			priceId: string;
			quantity: number;
			locale?: string;
			successUrl?: string;
			cancelUrl?: string;
		}): Promise<TDomainAddonCheckoutResponseDto> => {
			const token = await getToken();
			if (!token) throw new Error('Missing auth token');

			return apiRequest<TDomainAddonCheckoutResponseDto>(`${BASE_PATH}/checkout-session`, {
				method: 'POST',
				body: JSON.stringify(params),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: (data) => {
			// Same-tab redirect, matching the Pro checkout flow
			window.location.href = data.url;
		},
	});
}

/**
 * Quotes a quantity change before it is applied.
 *
 * Kept out of the mutation on purpose: the customer has to see the exact amount and the payment
 * method before confirming, which is also what makes the confirmation legally sound for a paid
 * order.
 */
export function useDomainAddonQuantityPreview(quantity: number, enabled: boolean) {
	const { getToken, isLoaded, isSignedIn, userId } = useAuth();

	return useQuery({
		queryKey: [...domainAddonQueryKeys.addon, userId, 'preview', quantity],
		enabled: enabled && isLoaded && !!isSignedIn,
		queryFn: async (): Promise<TDomainAddonQuantityPreviewDto> => {
			const token = await getToken();
			if (!token) throw new Error('Missing auth token');

			return apiRequest<TDomainAddonQuantityPreviewDto>(
				`${BASE_PATH}/quantity/preview`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
				{ quantity },
			);
		},
		// Stripe prorates to the second, so a cached quote goes stale quickly.
		staleTime: 0,
		gcTime: 0,
		retry: 1,
	});
}

export function useUpdateDomainAddonQuantity() {
	const { getToken } = useAuth();
	const invalidate = useAddonMutationInvalidation();

	return useMutation({
		mutationFn: async (params: {
			quantity: number;
			prorationDate?: number | null;
		}): Promise<TDomainAddonQuantityResponseDto> => {
			const token = await getToken();
			if (!token) throw new Error('Missing auth token');

			return apiRequest<TDomainAddonQuantityResponseDto>(`${BASE_PATH}/quantity`, {
				method: 'PATCH',
				body: JSON.stringify({
					quantity: params.quantity,
					// Sending the quote's timestamp back makes Stripe bill exactly what was shown.
					...(params.prorationDate ? { prorationDate: params.prorationDate } : {}),
				}),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: invalidate,
	});
}

export function useCancelDomainAddon() {
	const { getToken } = useAuth();
	const invalidate = useAddonMutationInvalidation();

	return useMutation({
		mutationFn: async (): Promise<TDomainAddonCancelResponseDto> => {
			const token = await getToken();
			if (!token) throw new Error('Missing auth token');

			// No Content-Type: this call sends no body.
			return apiRequest<TDomainAddonCancelResponseDto>(BASE_PATH, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			});
		},
		onSuccess: invalidate,
	});
}

/** Drops a parked reduction so the current slot count simply carries on. */
export function useCancelScheduledDomainAddonReduction() {
	const { getToken } = useAuth();
	const invalidate = useAddonMutationInvalidation();

	return useMutation({
		mutationFn: async (): Promise<TDomainAddonQuantityResponseDto> => {
			const token = await getToken();
			if (!token) throw new Error('Missing auth token');

			// No Content-Type: this call sends no body.
			return apiRequest<TDomainAddonQuantityResponseDto>(`${BASE_PATH}/quantity/pending/cancel`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			});
		},
		onSuccess: invalidate,
	});
}

export function useReactivateDomainAddon() {
	const { getToken } = useAuth();
	const invalidate = useAddonMutationInvalidation();

	return useMutation({
		mutationFn: async (): Promise<TDomainAddonCancelResponseDto> => {
			const token = await getToken();
			if (!token) throw new Error('Missing auth token');

			// No Content-Type: this call sends no body.
			return apiRequest<TDomainAddonCancelResponseDto>(`${BASE_PATH}/reactivate`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			});
		},
		onSuccess: invalidate,
	});
}
