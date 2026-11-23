'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import type {
	TCreateScanIpExclusionDto,
	TCurrentClientIpResponseDto,
	TScanIpExclusionListResponseDto,
	TScanIpExclusionResponseDto,
} from '@shared/schemas';

export const scanIpExclusionQueryKeys = {
	list: ['scanIpExclusions'] as const,
	currentIp: ['currentClientIp'] as const,
};

export function useListScanIpExclusionsQuery() {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: scanIpExclusionQueryKeys.list,
		queryFn: async (): Promise<TScanIpExclusionListResponseDto> => {
			const token = await getToken();
			return apiRequest<TScanIpExclusionListResponseDto>('/scan-ip-exclusion', {
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

/** The public IP the backend sees for this browser, so the user can exclude their own network. */
export function useCurrentClientIpQuery(enabled: boolean) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: scanIpExclusionQueryKeys.currentIp,
		queryFn: async (): Promise<TCurrentClientIpResponseDto> => {
			const token = await getToken();
			return apiRequest<TCurrentClientIpResponseDto>('/scan-ip-exclusion/current-ip', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		enabled,
		// Short, because switching between Wi-Fi and mobile data changes the IP
		staleTime: 60 * 1000,
	});
}

export function useCreateScanIpExclusionMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (dto: TCreateScanIpExclusionDto): Promise<TScanIpExclusionResponseDto> => {
			const token = await getToken();
			return apiRequest<TScanIpExclusionResponseDto>('/scan-ip-exclusion', {
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
				queryKey: scanIpExclusionQueryKeys.list,
			});
		},
	});
}

export function useDeleteScanIpExclusionMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (id: string): Promise<{ deleted: boolean }> => {
			const token = await getToken();
			return apiRequest<{ deleted: boolean }>(`/scan-ip-exclusion/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: scanIpExclusionQueryKeys.list,
			});
		},
	});
}
