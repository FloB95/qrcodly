'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import type {
	TAnalyticsIntegrationListResponseDto,
	TAnalyticsIntegrationResponseDto,
	TCreateAnalyticsIntegrationDto,
	TUpdateAnalyticsIntegrationDto,
} from '@shared/schemas';

export const analyticsIntegrationQueryKeys = {
	list: ['analyticsIntegrations'] as const,
};

export function useListAnalyticsIntegrationsQuery() {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: analyticsIntegrationQueryKeys.list,
		queryFn: async (): Promise<TAnalyticsIntegrationListResponseDto> => {
			const token = await getToken();
			return apiRequest<TAnalyticsIntegrationListResponseDto>('/analytics-integration', {
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

export function useCreateAnalyticsIntegrationMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (
			dto: TCreateAnalyticsIntegrationDto,
		): Promise<TAnalyticsIntegrationResponseDto> => {
			const token = await getToken();
			return apiRequest<TAnalyticsIntegrationResponseDto>('/analytics-integration', {
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
				queryKey: analyticsIntegrationQueryKeys.list,
			});
		},
	});
}

export function useUpdateAnalyticsIntegrationMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async ({
			id,
			dto,
		}: {
			id: string;
			dto: TUpdateAnalyticsIntegrationDto;
		}): Promise<TAnalyticsIntegrationResponseDto> => {
			const token = await getToken();
			return apiRequest<TAnalyticsIntegrationResponseDto>(`/analytics-integration/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(dto),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: analyticsIntegrationQueryKeys.list,
			});
		},
	});
}

export function useDeleteAnalyticsIntegrationMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (id: string): Promise<{ deleted: boolean }> => {
			const token = await getToken();
			return apiRequest<{ deleted: boolean }>(`/analytics-integration/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: analyticsIntegrationQueryKeys.list,
			});
		},
	});
}

export function useTestAnalyticsIntegrationMutation() {
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (id: string): Promise<{ valid: boolean; credentialsVerified: boolean }> => {
			const token = await getToken();
			return apiRequest<{ valid: boolean; credentialsVerified: boolean }>(
				`/analytics-integration/${id}/test`,
				{
					method: 'POST',
					body: JSON.stringify({}),
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
			);
		},
	});
}
