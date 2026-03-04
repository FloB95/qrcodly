'use client';

import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TCreateTagDto,
	TTagPaginatedResponseDto,
	TTagResponseDto,
	TUpdateTagDto,
} from '@shared/schemas';
import { apiRequest } from '../utils';
import { qrCodeQueryKeys } from './qr-code';

export const tagQueryKeys = {
	listTags: ['listTags'],
} as const;

export function useListTagsQuery(page = 1, limit = 10, search?: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...tagQueryKeys.listTags, page, limit, search],
		queryFn: async () => {
			const token = await getToken();
			const queryParams: Record<string, unknown> = { page, limit };
			if (search) {
				queryParams.where = { name: { like: search } };
			}
			return apiRequest<TTagPaginatedResponseDto>(
				'/tag',
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
				queryParams,
			);
		},
		placeholderData: keepPreviousData,
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000,
		retry: 2,
	});
}

export function useCreateTagMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (dto: TCreateTagDto): Promise<TTagResponseDto> => {
			const token = await getToken();
			return apiRequest<TTagResponseDto>('/tag', {
				method: 'POST',
				body: JSON.stringify(dto),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({ queryKey: tagQueryKeys.listTags });
		},
	});
}

export function useUpdateTagMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: TUpdateTagDto;
		}): Promise<TTagResponseDto> => {
			const token = await getToken();
			return apiRequest<TTagResponseDto>(`/tag/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: tagQueryKeys.listTags });
			void queryClient.invalidateQueries({ queryKey: qrCodeQueryKeys.listQrCodes });
		},
	});
}

export function useDeleteTagMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const token = await getToken();
			await apiRequest<void>(`/tag/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: tagQueryKeys.listTags });
			void queryClient.invalidateQueries({ queryKey: qrCodeQueryKeys.listQrCodes });
		},
	});
}

export function useSetQrCodeTagsMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async ({
			qrCodeId,
			tagIds,
		}: {
			qrCodeId: string;
			tagIds: string[];
		}): Promise<TTagResponseDto[]> => {
			const token = await getToken();
			return apiRequest<TTagResponseDto[]>(`/tag/qr-code/${qrCodeId}`, {
				method: 'PUT',
				body: JSON.stringify({ tagIds }),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({ queryKey: qrCodeQueryKeys.listQrCodes });
			void queryClient.refetchQueries({ queryKey: tagQueryKeys.listTags });
		},
	});
}
