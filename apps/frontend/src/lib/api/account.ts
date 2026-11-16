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
		// the request is confirmed from a mail, usually in another tab: re-check when coming back
		staleTime: 0,
	});
}

function useAccountDeletionRequestMutation(method: 'POST' | 'DELETE') {
	const queryClient = useQueryClient();
	const call = useDeletionRequestCall();

	return useMutation({
		mutationFn: () => call(method),
		onSuccess: async (data) => {
			// a status fetch started before the change must not overwrite its result afterwards
			await queryClient.cancelQueries({ queryKey: accountQueryKeys.deletionRequest });
			queryClient.setQueryData(accountQueryKeys.deletionRequest, data);
		},
	});
}

/** Confirms a request with the secret from the mailed link. Needs no session. */
export function useConfirmAccountDeletionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (token: string) =>
			apiRequest<TAccountDeletionRequestResponseDto>(`${DELETION_REQUEST_PATH}/confirm`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.deletionRequest }),
	});
}

export const useRequestAccountDeletionMutation = () => useAccountDeletionRequestMutation('POST');
export const useRevokeAccountDeletionMutation = () => useAccountDeletionRequestMutation('DELETE');
