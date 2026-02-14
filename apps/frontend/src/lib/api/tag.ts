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
	allTags: ['allTags'],
} as const;

export function useListTagsQuery(page = 1, limit = 10) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...tagQueryKeys.listTags, page, limit],
		queryFn: async () => {
			const token = await getToken();
			return apiRequest<TTagPaginatedResponseDto>(
				'/tag',
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
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000,
		retry: 2,
	});
}

export function useAllTagsQuery() {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: tagQueryKeys.allTags,
		queryFn: async () => {
			const token = await getToken();
			return apiRequest<TTagResponseDto[]>('/tag/all', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
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
			void queryClient.refetchQueries({ queryKey: tagQueryKeys.allTags });
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
			void queryClient.invalidateQueries({ queryKey: tagQueryKeys.allTags });
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
			void queryClient.invalidateQueries({ queryKey: tagQueryKeys.allTags });
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
			void queryClient.refetchQueries({ queryKey: tagQueryKeys.allTags });
			void queryClient.refetchQueries({ queryKey: tagQueryKeys.listTags });
		},
	});
}
