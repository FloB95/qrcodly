'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { TSubmitUserSurveyDto, TUserSurveyStatusResponseDto } from '@shared/schemas';
import { apiRequest } from '../utils';

export const userSurveyQueryKeys = {
	status: ['userSurveyStatus'],
} as const;

export function useUserSurveyStatusQuery(enabled: boolean) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: userSurveyQueryKeys.status,
		queryFn: async () => {
			const token = await getToken();
			return apiRequest<TUserSurveyStatusResponseDto>('/user-survey/status', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		enabled,
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: 1,
	});
}

export function useSubmitUserSurveyMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (dto: TSubmitUserSurveyDto): Promise<TUserSurveyStatusResponseDto> => {
			const token = await getToken();
			return apiRequest<TUserSurveyStatusResponseDto>('/user-survey', {
				method: 'POST',
				body: JSON.stringify(dto),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: userSurveyQueryKeys.status });
		},
	});
}
