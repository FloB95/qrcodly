import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TBulkImportQrCodeDto,
	TCreateQrCodeDto,
	TQrCodeWithRelationsPaginatedResponseDto,
	TQrCodeWithRelationsResponseDto,
	TUpdateQrCodeDto,
} from '@shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import type { ApiError } from './ApiError';

// Define query keys
export const qrCodeQueryKeys = {
	listQrCodes: ['listQrCodes'],
} as const;

// Hook to fetch QR codes
export function useListQrCodesQuery(page = 1, limit = 10) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...qrCodeQueryKeys.listQrCodes, page, limit],
		queryFn: async (): Promise<TQrCodeWithRelationsPaginatedResponseDto> => {
			const token = await getToken();

			return apiRequest<TQrCodeWithRelationsPaginatedResponseDto>(
				`/qr-code?page=${page}&limit=${limit}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
			);
		},
		placeholderData: keepPreviousData,
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}

// Function to create a QR code
export function useCreateQrCodeMutation() {
	const queryClient = useQueryClient();
	const { updateLastError } = useQrCodeGeneratorStore((state) => state);
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (qrCode: TCreateQrCodeDto): Promise<TQrCodeWithRelationsResponseDto> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
			};
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}
			return apiRequest<TQrCodeWithRelationsResponseDto>('/qr-code', {
				method: 'POST',
				body: JSON.stringify(qrCode),
				headers,
			});
		},
		onSuccess: () => {
			// Invalidate the 'listQrCodes' query to refetch the updated data
			void queryClient.invalidateQueries({
				queryKey: qrCodeQueryKeys.listQrCodes,
			});
		},
		onError: (e: Error) => {
			const error = e as ApiError;
			updateLastError(error);
		},
	});
}

export function useBulkCreateQrCodeMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (dto: TBulkImportQrCodeDto) => {
			if (!dto.file) {
				throw new Error('File is required for bulk import');
			}

			const token = await getToken();
			const formData = new FormData();
			formData.append('contentType', dto.contentType as string);
			formData.append('config', JSON.stringify(dto.config));

			formData.append('file', dto.file);

			const headers: HeadersInit = {};
			if (token) headers.Authorization = `Bearer ${token}`;

			return apiRequest<TQrCodeWithRelationsResponseDto[]>('/qr-code/bulk-import', {
				method: 'POST',
				body: formData,
				headers,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['listQrCodes'] });
		},
	});
}

// Function to update a QR code
export function useUpdateQrCodeMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async ({
			qrCodeId,
			data,
		}: {
			qrCodeId: string;
			data: TUpdateQrCodeDto;
		}): Promise<void> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
			await apiRequest<void>(`/qr-code/${qrCodeId}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
				headers,
			});
		},
		onSuccess: () => {
			// Invalidate the 'listQrCodes' query to refetch the updated data
			void queryClient.invalidateQueries({
				queryKey: qrCodeQueryKeys.listQrCodes,
			});
		},
		onError: (error) => {
			console.error('Error updating QR code:', error);
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
				queryKey: qrCodeQueryKeys.listQrCodes,
			});
		},
		onError: (error) => {
			console.error('Error deleting QR code:', error);
		},
	});
}
