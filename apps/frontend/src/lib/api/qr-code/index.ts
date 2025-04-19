import { env } from '@/env';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TCreateQrCodeDto,
	TCreateQrCodeResponseDto,
	TQrCodePaginatedResponseDto,
} from '@shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';

if (!env.NEXT_PUBLIC_API_URL) {
	throw new Error('NEXT_PUBLIC_API_URL is not defined in the environment variables');
}

// Define query keys
export const queryKeys = {
	myQrCodes: ['myQrCodes'],
} as const;

// API request helper
async function apiRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
	try {
		const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${endpoint}`, options);

		if (!response.ok) {
			const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
			throw new Error(
				`API request failed with status ${response.status}: ${JSON.stringify(errorBody)}`,
			);
		}

		return (await response.json()) as T;
	} catch (error) {
		console.error('API request error:', error);
		throw new Error('Failed to communicate with the server');
	}
}

// Hook to fetch QR codes
export function useMyQrCodesQuery() {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: queryKeys.myQrCodes,
		queryFn: async (): Promise<TQrCodePaginatedResponseDto> => {
			const token = await getToken();

			return apiRequest<TQrCodePaginatedResponseDto>('/qr-code/get-my', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}

// Function to create a QR code
export function useCreateQrCodeMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (qrCode: TCreateQrCodeDto): Promise<TCreateQrCodeResponseDto> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
			};
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}
			return apiRequest<TCreateQrCodeResponseDto>('/qr-code', {
				method: 'POST',
				body: JSON.stringify(qrCode),
				headers,
			});
		},
		onSuccess: () => {
			// Invalidate the 'myQrCodes' query to refetch the updated data
			void queryClient.invalidateQueries({ queryKey: [...queryKeys.myQrCodes] });
		},
		onError: (error) => {
			console.error('Error creating QR code:', error);
		},
	});
}
// Function to delete a QR code
export function useDeleteQrCodeMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (qrCodeId: string): Promise<void> => {
			const token = await getToken();
			const headers: HeadersInit = {
				Authorization: `Bearer ${token}`,
			};
			await apiRequest<void>(`/qr-code/${qrCodeId}`, {
				method: 'DELETE',
				headers,
			});
		},
		onSuccess: () => {
			// Invalidate the 'myQrCodes' query to refetch the updated data
			void queryClient.invalidateQueries({ queryKey: [...queryKeys.myQrCodes] });
		},
		onError: (error) => {
			console.error('Error deleting QR code:', error);
		},
	});
}
