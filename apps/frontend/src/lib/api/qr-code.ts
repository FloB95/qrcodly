import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TCreateQrCodeDto,
	TCreateQrCodeResponseDto,
	TQrCodeWithRelationsPaginatedResponseDto,
} from '@shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils';

// Define query keys
export const queryKeys = {
	listQrCodes: ['listQrCodes'],
} as const;

// Hook to fetch QR codes
export function useListQrCodesQuery() {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: queryKeys.listQrCodes,
		queryFn: async (): Promise<TQrCodeWithRelationsPaginatedResponseDto> => {
			const token = await getToken();

			return apiRequest<TQrCodeWithRelationsPaginatedResponseDto>('/qr-code', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		refetchOnWindowFocus: false,
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
			// Invalidate the 'listQrCodes' query to refetch the updated data
			void queryClient.invalidateQueries({
				queryKey: queryKeys.listQrCodes,
			});
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
			// Invalidate the 'listQrCodes' query to refetch the updated data
			void queryClient.invalidateQueries({
				queryKey: queryKeys.listQrCodes,
			});
		},
		onError: (error) => {
			console.error('Error deleting QR code:', error);
		},
	});
}
