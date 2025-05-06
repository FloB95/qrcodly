import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils';
import type { TAnalyticsResponseDto, TShortUrl } from '@shared/schemas';
import { qrCodeQueryKeys } from './qr-code';

// Define query keys
export const urlShortenerQueryKeys = {
	qrCodeViews: ['qrCodeViews'],
	shortCodeAnalytics: ['shortCodeAnalytics'],
	reservedShortUrl: ['reservedShortUrl'],
} as const;

// Function to delete a configuration template
export function useGetReservedShortUrlQuery() {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: urlShortenerQueryKeys.reservedShortUrl,
		queryFn: async (): Promise<TShortUrl | null> => {
			const token = await getToken();

			if (!token) return null;

			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
			return await apiRequest<TShortUrl>(`/short-url/reserved`, {
				method: 'GET',
				headers,
			});
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}

export function useToggleActiveStateMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (shortCode: string): Promise<TShortUrl> => {
			const token = await getToken();
			const headers: HeadersInit = {
				Authorization: `Bearer ${token}`,
			};
			return await apiRequest<TShortUrl>(`/short-url/${shortCode}/toggle-active-state`, {
				method: 'POST',
				headers,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: qrCodeQueryKeys.listQrCodes,
			});
		},
	});
}

export function useGetViewsFromShortCodeQuery(shortCode: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...urlShortenerQueryKeys.qrCodeViews, shortCode],
		queryFn: async (): Promise<{ views: number }> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
			return await apiRequest<{ views: number }>(`/short-url/${shortCode}/get-views`, {
				method: 'GET',
				headers,
			});
		},
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}

export function useGetAnalyticsFromShortCodeQuery(shortCode: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...urlShortenerQueryKeys.shortCodeAnalytics, shortCode],
		queryFn: async (): Promise<TAnalyticsResponseDto> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
			return await apiRequest<TAnalyticsResponseDto>(`/short-url/${shortCode}/analytics`, {
				method: 'GET',
				headers,
			});
		},
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}
