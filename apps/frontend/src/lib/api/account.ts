'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { TAccountDeletionRequestResponseDto } from '@shared/schemas';
import { apiRequest } from '../utils';

export const accountQueryKeys = {
	deletionRequest: ['accountDeletionRequest'],
} as const;

const DELETION_REQUEST_PATH = '/account/deletion-request';

function useDeletionRequestCall() {
	const { getToken } = useAuth();

	return async (method: 'GET' | 'POST' | 'DELETE') => {
		const token = await getToken();
		return apiRequest<TAccountDeletionRequestResponseDto>(DELETION_REQUEST_PATH, {
			method,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
	};
}

export function useAccountDeletionRequestQuery() {
	const call = useDeletionRequestCall();

	return useQuery({
		queryKey: accountQueryKeys.deletionRequest,
		queryFn: () => call('GET'),
	});
}

function useAccountDeletionRequestMutation(method: 'POST' | 'DELETE') {
	const queryClient = useQueryClient();
	const call = useDeletionRequestCall();

	return useMutation({
		mutationFn: () => call(method),
		onSuccess: (data) => {
			queryClient.setQueryData(accountQueryKeys.deletionRequest, data);
		},
	});
}

export const useRequestAccountDeletionMutation = () => useAccountDeletionRequestMutation('POST');
export const useRevokeAccountDeletionMutation = () => useAccountDeletionRequestMutation('DELETE');
