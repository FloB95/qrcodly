import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TBulkImportQrCodeDto,
	TCreateQrCodeDto,
	TQrCodeContentType,
	TQrCodeWithRelationsPaginatedResponseDto,
	TQrCodeWithRelationsResponseDto,
	TUpdateQrCodeDto,
} from '@shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import type { ApiError } from './ApiError';

export const qrCodeQueryKeys = {
	listQrCodes: ['listQrCodes'],
} as const;

export type QrCodeFilters = {
	search?: string;
	contentType?: TQrCodeContentType[];
	tagIds?: string[];
};

export async function fetchQrCodesPage(
	token: string | null,
	page: number,
	limit: number,
	filters?: QrCodeFilters,
): Promise<TQrCodeWithRelationsPaginatedResponseDto> {
	const queryParams: Record<string, unknown> = { page, limit };

	if (filters?.search) {
		queryParams['where[name][like]'] = filters.search;
	}
	if (filters?.contentType && filters.contentType.length > 0) {
		queryParams.contentType = filters.contentType;
	}
	if (filters?.tagIds && filters.tagIds.length > 0) {
		queryParams.tagIds = filters.tagIds;
	}

	return apiRequest<TQrCodeWithRelationsPaginatedResponseDto>(
		'/qr-code',
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		},
		queryParams,
	);
}

export function useListQrCodesQuery(page = 1, limit = 10, filters?: QrCodeFilters) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...qrCodeQueryKeys.listQrCodes, page, limit, filters],
		queryFn: async () => {
			const token = await getToken();
			return fetchQrCodesPage(token, page, limit, filters);
		},
		placeholderData: keepPreviousData,
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000,
		retry: 2,
	});
}

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
			void queryClient.refetchQueries({
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
			void queryClient.refetchQueries({ queryKey: ['listQrCodes'] });
		},
	});
}

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
			void queryClient.refetchQueries({
				queryKey: qrCodeQueryKeys.listQrCodes,
			});
		},
		onError: () => {},
	});
}

export function useDuplicateQrCodeMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (qrCodeId: string): Promise<TQrCodeWithRelationsResponseDto> => {
			const token = await getToken();
			return apiRequest<TQrCodeWithRelationsResponseDto>(`/qr-code/${qrCodeId}/duplicate`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			});
		},
		onSuccess: () => {
			void queryClient.refetchQueries({
				queryKey: qrCodeQueryKeys.listQrCodes,
			});
		},
	});
}

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
			void queryClient.refetchQueries({
				queryKey: qrCodeQueryKeys.listQrCodes,
			});
		},
		onError: () => {},
	});
}
