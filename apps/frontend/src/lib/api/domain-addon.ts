'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { customDomainQueryKeys } from '@/lib/api/custom-domain';
import type {
	TDomainAddonCancelResponseDto,
	TDomainAddonCheckoutResponseDto,
	TDomainAddonQuantityResponseDto,
	TDomainAddonResponseDto,
} from '@shared/schemas';

export const domainAddonQueryKeys = {
	addon: ['domain-addon'] as const,
};

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

export function useUpdateDomainAddonQuantity() {
	const { getToken } = useAuth();
	const invalidate = useAddonMutationInvalidation();

	return useMutation({
		mutationFn: async (quantity: number): Promise<TDomainAddonQuantityResponseDto> => {
			const token = await getToken();
			if (!token) throw new Error('Missing auth token');

			return apiRequest<TDomainAddonQuantityResponseDto>(`${BASE_PATH}/quantity`, {
				method: 'PATCH',
				body: JSON.stringify({ quantity }),
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
