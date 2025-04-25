import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../utils';
import type { TAnalyticsResponseDto, TShortUrl } from '@shared/schemas';

// Define query keys
export const queryKeys = {
	qrCodeViews: ['qrCodeViews'],
	shortCodeAnalytics: ['shortCodeAnalytics'],
} as const;

// Function to delete a configuration template
export function useGetReservedShortUrlMutation() {
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (): Promise<TShortUrl> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
			return await apiRequest<TShortUrl>(`/short-url/reserved`, {
				method: 'GET',
				headers,
			});
		},
		onError: (error) => {
			console.error('Error deleting configuration template:', error);
		},
	});
}

export function useGetViewsFromShortCodeQuery(shortCode: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...queryKeys.qrCodeViews, shortCode],
		queryFn: async (): Promise<{ views: number }> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
			return await apiRequest<{ views: number }>(
				`/short-url/${shortCode}/get-views`,
				{
					method: 'GET',
					headers,
				},
			);
		},
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}

export function useGetAnalyticsFromShortCode(shortCode: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...queryKeys.shortCodeAnalytics, shortCode],
		queryFn: async (): Promise<TAnalyticsResponseDto> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
			return await apiRequest<TAnalyticsResponseDto>(
				`/short-url/${shortCode}/analytics`,
				{
					method: 'GET',
					headers,
				},
			);
		},
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}
