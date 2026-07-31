import { useAuth } from '@clerk/nextjs';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils';
import { qrCodeQueryKeys } from './qr-code';
import type {
	TAcknowledgeSafetyIncidentsResponseDto,
	TAnalyticsResponseDto,
	TCreateShortUrlDto,
	TSafetyIncidentListResponseDto,
	TShortUrl,
	TShortUrlStatusFilter,
	TShortUrlWithCustomDomainPaginatedResponseDto,
	TShortUrlWithCustomDomainResponseDto,
	TUpdateShortUrlDto,
} from '@shared/schemas';

// Define query keys
export const urlShortenerQueryKeys = {
	qrCodeViews: ['qrCodeViews'],
	shortCodeAnalytics: ['shortCodeAnalytics'],
	reservedShortUrl: ['reservedShortUrl'],
	listShortUrls: ['listShortUrls'],
	safetyIncidents: ['safetyIncidents'],
} as const;

/**
 * Open URL-safety findings for the signed-in user.
 *
 * Mounted in the dashboard layout, so this runs on every dashboard page — the 5-minute staleTime is
 * what keeps it to roughly one request per session per window. Do not add a refetchInterval.
 */
export function useSafetyIncidentsQuery(enabled = true) {
	const { getToken, isSignedIn } = useAuth();

	return useQuery({
		queryKey: urlShortenerQueryKeys.safetyIncidents,
		queryFn: async (): Promise<TSafetyIncidentListResponseDto> => {
			const token = await getToken();
			return apiRequest<TSafetyIncidentListResponseDto>('/short-url/safety-incidents', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: enabled && !!isSignedIn,
	});
}

export function useAcknowledgeSafetyIncidentsMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (): Promise<TAcknowledgeSafetyIncidentsResponseDto> => {
			const token = await getToken();
			return apiRequest<TAcknowledgeSafetyIncidentsResponseDto>(
				'/short-url/safety-incidents/acknowledge',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: urlShortenerQueryKeys.safetyIncidents });
		},
	});
}

// Function to delete a configuration template
export function useGetReservedShortUrlQuery() {
	const { getToken, isSignedIn } = useAuth();

	return useQuery<TShortUrl | null>({
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
		enabled: !!isSignedIn,
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
				method: 'PATCH',
				headers,
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: urlShortenerQueryKeys.listShortUrls,
			});
			void queryClient.refetchQueries({
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

export type ShortUrlFilters = {
	search?: string;
	tagIds?: string[];
	status?: TShortUrlStatusFilter;
};

export function useListShortUrlsQuery(page = 1, limit = 10, filters?: ShortUrlFilters) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...urlShortenerQueryKeys.listShortUrls, page, limit, filters],
		queryFn: async (): Promise<TShortUrlWithCustomDomainPaginatedResponseDto> => {
			const token = await getToken();
			const queryParams: Record<string, unknown> = { page, limit, standalone: true };

			if (filters?.search) {
				queryParams['where[destinationUrl][like]'] = filters.search;
				queryParams['where[shortCode][like]'] = filters.search;
			}

			if (filters?.tagIds && filters.tagIds.length > 0) {
				queryParams.tagIds = filters.tagIds;
			}

			if (filters?.status && filters.status !== 'all') {
				queryParams.status = filters.status;
			}

			return apiRequest<TShortUrlWithCustomDomainPaginatedResponseDto>(
				'/short-url',
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

export function useCreateShortUrlMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (dto: TCreateShortUrlDto): Promise<TShortUrlWithCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TShortUrlWithCustomDomainResponseDto>('/short-url', {
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
				queryKey: urlShortenerQueryKeys.listShortUrls,
			});
		},
	});
}

export function useDuplicateShortUrlMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (shortCode: string): Promise<TShortUrlWithCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TShortUrlWithCustomDomainResponseDto>(`/short-url/${shortCode}/duplicate`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: urlShortenerQueryKeys.listShortUrls,
			});
		},
	});
}

export function useDeleteShortUrlMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (shortCode: string): Promise<void> => {
			const token = await getToken();
			await apiRequest<{ deleted: boolean }>(`/short-url/${shortCode}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: urlShortenerQueryKeys.listShortUrls,
			});
		},
	});
}

export function useUpdateShortUrlNameMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async ({
			shortCode,
			name,
		}: {
			shortCode: string;
			name: string | null;
		}): Promise<TShortUrlWithCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TShortUrlWithCustomDomainResponseDto>(`/short-url/${shortCode}`, {
				method: 'PATCH',
				body: JSON.stringify({ name }),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: urlShortenerQueryKeys.listShortUrls,
			});
		},
	});
}

export function useUpdateShortUrlMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async ({
			shortCode,
			data,
		}: {
			shortCode: string;
			data: TUpdateShortUrlDto;
		}): Promise<TShortUrlWithCustomDomainResponseDto> => {
			const token = await getToken();
			return apiRequest<TShortUrlWithCustomDomainResponseDto>(`/short-url/${shortCode}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: urlShortenerQueryKeys.listShortUrls,
			});
		},
	});
}
