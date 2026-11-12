'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TNewsletterSubscriptionResponseDto,
	TUpdateNewsletterSubscriptionDto,
} from '@shared/schemas';
import { apiRequest } from '../utils';

export const newsletterQueryKeys = {
	subscription: (userId: string | null | undefined) =>
		['newsletterSubscription', userId ?? 'anon'] as const,
} as const;

export function useNewsletterSubscriptionQuery() {
	const { getToken, userId } = useAuth();

	return useQuery({
		queryKey: newsletterQueryKeys.subscription(userId),
		queryFn: async () => {
			const token = await getToken();
			return apiRequest<TNewsletterSubscriptionResponseDto>('/newsletter/subscription', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		enabled: !!userId,
		refetchOnWindowFocus: false,
		retry: 1,
	});
}

export function useUpdateNewsletterSubscriptionMutation() {
	const { getToken, userId } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (dto: TUpdateNewsletterSubscriptionDto) => {
			const token = await getToken();
			return apiRequest<TNewsletterSubscriptionResponseDto>('/newsletter/subscription', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(dto),
			});
		},
		onSuccess: (data) => {
			queryClient.setQueryData(newsletterQueryKeys.subscription(userId), data);
		},
	});
}
