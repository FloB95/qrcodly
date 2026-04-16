'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TApiKeyResponseDto,
	TCreateApiKeyDto,
	TCreateApiKeyResponseDto,
} from '@shared/schemas';
import { apiRequest } from '../utils';

export const apiKeyQueryKeys = {
	list: ['listApiKeys'],
} as const;

export function useListApiKeysQuery() {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: apiKeyQueryKeys.list,
		queryFn: async () => {
			const token = await getToken();
			return apiRequest<{ data: TApiKeyResponseDto[] }>('/api-key', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 60 * 1000,
	});
}

export function useCreateApiKeyMutation() {
	const { getToken } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (dto: TCreateApiKeyDto) => {
			const token = await getToken();
			return apiRequest<TCreateApiKeyResponseDto>('/api-key', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(dto),
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: apiKeyQueryKeys.list });
		},
	});
}

export function useRevokeApiKeyMutation() {
	const { getToken } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const token = await getToken();
			await apiRequest<{ deleted: boolean }>(`/api-key/${id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: apiKeyQueryKeys.list });
		},
	});
}
