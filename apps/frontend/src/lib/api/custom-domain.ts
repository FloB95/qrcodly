'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import type {
	TCustomDomainResponseDto,
	TCustomDomainListResponseDto,
	TCreateCustomDomainDto,
} from '@shared/schemas';
import { urlShortenerQueryKeys } from './url-shortener';
import { domainAddonQueryKeys } from './domain-addon.keys';

/**
 * Setup instructions type for two-phase verification.
 * Phase 1 (dns_verification): Ownership TXT + CNAME + DCV Delegation
 * Phase 2 (cloudflare_ssl): SSL TXT record
 */
export type TSetupInstructions = {
	phase: 'dns_verification' | 'cloudflare_ssl';
	ownershipValidationRecord: {
		recordType: 'TXT';
		recordHost: string;
		recordValue: string;
	} | null;
	cnameRecord: {
		recordType: 'CNAME';
		recordHost: string;
		recordValue: string;
	};
	// DCV delegation CNAME for automatic SSL certificate issuance/renewal
	dcvDelegationRecord: {
		recordType: 'CNAME';
		recordHost: string;
		recordValue: string;
	};
	sslValidationRecord: {
		recordType: 'TXT';
		recordHost: string;
		recordValue: string;
	} | null;
	ownershipTxtVerified: boolean;
	cnameVerified: boolean;
	dcvDelegationVerified: boolean;
	instructions: string;
};

/**
 * Query keys for custom domain data.
 */
export const customDomainQueryKeys = {
	all: ['customDomainsAll'] as const,
	list: ['customDomains'] as const,
	detail: (id: string) => ['customDomain', id] as const,
	default: ['customDomainDefault'] as const,
	setupInstructions: (id: string) => ['customDomainSetup', id] as const,
};

/**
 * Hook to list all custom domains for the authenticated user.
 */
export function useListCustomDomainsQuery(page = 1, limit = 10) {
	const { getToken, isSignedIn } = useAuth();

	return useQuery({
		queryKey: [...customDomainQueryKeys.list, page, limit],
		queryFn: async (): Promise<TCustomDomainListResponseDto> => {
			const token = await getToken();
			return apiRequest<TCustomDomainListResponseDto>(
				'/custom-domain',
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
				{ page, limit },
			);
		},
		placeholderData: keepPreviousData,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
		enabled: !!isSignedIn,
	});
}

/**
 * Hook to fetch all custom domains (non-paginated).
 * Useful for populating lookups/dropdowns where you need all domains cached.
 */
export function useAllCustomDomainsQuery() {
	const { getToken, isSignedIn } = useAuth();

	return useQuery({
		queryKey: customDomainQueryKeys.all,
		queryFn: async (): Promise<TCustomDomainResponseDto[]> => {
			const token = await getToken();
			const response = await apiRequest<TCustomDomainListResponseDto>(
				'/custom-domain',
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
				{ page: 1, limit: 100 }, // Fetch up to 100 domains (should be enough for any user)
			);
			return response.data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: !!isSignedIn,
	});
}

/**
 * Hook to look up a custom domain by ID from the cached list.
 * Returns the domain object or null if not found/not loaded.
 */
export function useCustomDomainLookup(customDomainId: string | null | undefined) {
	const { data: domains, isLoading } = useAllCustomDomainsQuery();

	const domain = useMemo(() => {
		if (!customDomainId || !domains) return null;
		return domains.find((d) => d.id === customDomainId) ?? null;
	}, [customDomainId, domains]);

	return { domain, isLoading };
}

/**
 * Hook to get a single custom domain by ID.
 */
export function useCustomDomainQuery(id: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: customDomainQueryKeys.detail(id),
		queryFn: async (): Promise<TCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TCustomDomainResponseDto>(`/custom-domain/${id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!id,
	});
}

/**
 * Hook to create a new custom domain.
 */
export function useCreateCustomDomainMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (dto: TCreateCustomDomainDto): Promise<TCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TCustomDomainResponseDto>('/custom-domain', {
				method: 'POST',
				body: JSON.stringify(dto),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.list,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.all,
			});
			// The add-on payload carries the used/available slot count shown above the table.
			void queryClient.refetchQueries({
				queryKey: domainAddonQueryKeys.addon,
			});
		},
	});
}

/**
 * Hook to verify a custom domain.
 */
export function useVerifyCustomDomainMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (id: string): Promise<TCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TCustomDomainResponseDto>(`/custom-domain/${id}/verify`, {
				method: 'POST',
				body: JSON.stringify({}),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: (data) => {
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.list,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.all,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.detail(data.id),
			});
			// Refresh setup instructions since phase may have changed
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.setupInstructions(data.id),
			});
		},
	});
}

/**
 * Hook to delete a custom domain.
 */
export function useDeleteCustomDomainMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (id: string): Promise<{ deleted: boolean }> => {
			const token = await getToken();
			return apiRequest<{ deleted: boolean }>(`/custom-domain/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.list,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.all,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.default,
			});
			// The add-on payload carries the used/available slot count shown above the table.
			void queryClient.refetchQueries({
				queryKey: domainAddonQueryKeys.addon,
			});
			// The reserved short URL may have pointed at this domain; the server reassigns it on
			// the next read. `refetchQueries`, not `removeQueries` — the latter only drops the
			// cache entry and never refetches a mounted observer, so the generator would keep
			// showing the old domain until a full page reload.
			void queryClient.refetchQueries({
				queryKey: urlShortenerQueryKeys.reservedShortUrl,
			});
		},
	});
}

/**
 * Hook to get the user's default custom domain.
 */
export function useDefaultCustomDomainQuery() {
	const { getToken, isSignedIn } = useAuth();

	return useQuery({
		queryKey: customDomainQueryKeys.default,
		queryFn: async (): Promise<TCustomDomainResponseDto | null> => {
			const token = await getToken();
			return apiRequest<TCustomDomainResponseDto | null>('/custom-domain/default', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!isSignedIn,
	});
}

/**
 * Hook to get setup instructions (Cloudflare TXT records + CNAME) for a custom domain.
 */
/**
 * @param enabled Fetch only once the instructions are actually wanted. The domain list renders one
 * of these per row, so fetching eagerly meant a request per domain on every page load — and a
 * backend error for every disabled domain, which has no instructions to hand out.
 */
export function useSetupInstructionsQuery(id: string, enabled = true) {
	const { getToken } = useAuth();

	return useQuery({
		enabled: enabled && !!id,
		queryKey: customDomainQueryKeys.setupInstructions(id),
		queryFn: async (): Promise<TSetupInstructions> => {
			const token = await getToken();
			return apiRequest<TSetupInstructions>(`/custom-domain/${id}/setup-instructions`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 30 * 1000, // 30 seconds - instructions change when verification phase transitions
	});
}

/**
 * Hook to set a custom domain as the default.
 */
export function useSetDefaultCustomDomainMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (id: string): Promise<TCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TCustomDomainResponseDto>(`/custom-domain/${id}/set-default`, {
				method: 'POST',
				body: JSON.stringify({}),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.list,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.all,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.default,
			});
			// Pull the reserved short URL again so the generator shows the new domain at once.
			// `removeQueries` would only drop the cache entry without refetching the mounted
			// observer, which is what made the change visible only after a page reload.
			void queryClient.refetchQueries({
				queryKey: urlShortenerQueryKeys.reservedShortUrl,
			});
		},
	});
}

/**
 * Hook to clear the default custom domain.
 */
export function useClearDefaultCustomDomainMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (): Promise<{ success: boolean }> => {
			const token = await getToken();
			return apiRequest<{ success: boolean }>('/custom-domain/clear-default', {
				method: 'POST',
				body: JSON.stringify({}),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.list,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.all,
			});
			void queryClient.refetchQueries({
				queryKey: customDomainQueryKeys.default,
			});
			// Pull the reserved short URL again so the generator falls back to the system domain
			// at once. See the note in the set-default mutation on why this is not
			// `removeQueries`.
			void queryClient.refetchQueries({
				queryKey: urlShortenerQueryKeys.reservedShortUrl,
			});
		},
	});
}
