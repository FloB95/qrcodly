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

/**
 * Full setup instructions type (TXT + CNAME records).
 */
export type TFullSetupInstructions = {
	txtRecord: {
		recordType: string;
		recordHost: string;
		recordValue: string;
	};
	cnameRecord: {
		recordType: string;
		recordHost: string;
		recordValue: string;
	};
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
	verificationInstructions: (id: string) => ['customDomainVerification', id] as const,
	setupInstructions: (id: string) => ['customDomainSetup', id] as const,
};

/**
 * Hook to list all custom domains for the authenticated user.
 */
export function useListCustomDomainsQuery(page = 1, limit = 10) {
	const { getToken } = useAuth();

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
	});
}

/**
 * Hook to fetch all custom domains (non-paginated).
 * Useful for populating lookups/dropdowns where you need all domains cached.
 */
export function useAllCustomDomainsQuery() {
	const { getToken } = useAuth();

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
 * Hook to get verification instructions for a custom domain.
 */
export function useVerificationInstructionsQuery(id: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: customDomainQueryKeys.verificationInstructions(id),
		queryFn: async () => {
			const token = await getToken();
			return apiRequest<{
				recordType: string;
				recordHost: string;
				recordValue: string;
				instructions: string;
			}>(`/custom-domain/${id}/verification-instructions`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 60 * 60 * 1000, // 1 hour (token doesn't change)
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
		mutationFn: async (id: string): Promise<void> => {
			const token = await getToken();
			const headers: HeadersInit = {
				Authorization: `Bearer ${token}`,
			};
			await apiRequest<void>(`/custom-domain/${id}`, {
				method: 'DELETE',
				headers,
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
			// Remove cached reserved short URL in case it was using this domain
			void queryClient.removeQueries({
				queryKey: urlShortenerQueryKeys.reservedShortUrl,
			});
		},
	});
}

/**
 * Hook to get the user's default custom domain.
 */
export function useDefaultCustomDomainQuery() {
	const { getToken } = useAuth();

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
	});
}

/**
 * Hook to get full setup instructions (TXT + CNAME) for a custom domain.
 */
export function useSetupInstructionsQuery(id: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: customDomainQueryKeys.setupInstructions(id),
		queryFn: async (): Promise<TFullSetupInstructions> => {
			const token = await getToken();
			return apiRequest<TFullSetupInstructions>(`/custom-domain/${id}/setup-instructions`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 60 * 60 * 1000, // 1 hour (tokens don't change)
	});
}

/**
 * Hook to verify CNAME record for a custom domain.
 */
export function useVerifyCnameMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (id: string): Promise<TCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TCustomDomainResponseDto>(`/custom-domain/${id}/verify-cname`, {
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
		},
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
			// Remove cached reserved short URL so it refetches with the new default domain
			void queryClient.removeQueries({
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
			// Remove cached reserved short URL so it refetches without the domain
			void queryClient.removeQueries({
				queryKey: urlShortenerQueryKeys.reservedShortUrl,
			});
		},
	});
}
