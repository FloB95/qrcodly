import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TQrCodeShareResponseDto,
	TCreateQrCodeShareDto,
	TUpdateQrCodeShareDto,
	TPublicSharedQrCodeResponseDto,
} from '@shared/schemas';
import { apiRequest } from '../utils';

// Define query keys
export const qrCodeShareQueryKeys = {
	share: (qrCodeId: string) => ['qr-code-share', qrCodeId],
} as const;

/**
 * Hook to fetch the share link for a QR code.
 * @param qrCodeId - The QR code ID
 * @param enabled - Whether to enable the query (default: true). Set to false to defer fetching until needed.
 */
export function useQrCodeShareQuery(qrCodeId: string, enabled = true) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: qrCodeShareQueryKeys.share(qrCodeId),
		queryFn: async (): Promise<TQrCodeShareResponseDto | null> => {
			const token = await getToken();
			try {
				return await apiRequest<TQrCodeShareResponseDto>(`/qr-code/${qrCodeId}/share`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				});
			} catch (error) {
				// Only treat 404 as "share doesn't exist"
				if (error instanceof Error && error.message.includes('404')) {
					return null;
				}
				throw error;
			}
		},
		enabled,
		retry: false,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to create a share link for a QR code.
 */
export function useCreateQrCodeShareMutation() {
	const { getToken } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			qrCodeId,
			data,
		}: {
			qrCodeId: string;
			data?: TCreateQrCodeShareDto;
		}): Promise<TQrCodeShareResponseDto> => {
			const token = await getToken();
			return apiRequest<TQrCodeShareResponseDto>(`/qr-code/${qrCodeId}/share`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(data ?? {}),
			});
		},
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({
				queryKey: qrCodeShareQueryKeys.share(variables.qrCodeId),
			});
		},
	});
}

/**
 * Hook to update a share link configuration.
 */
export function useUpdateQrCodeShareMutation() {
	const { getToken } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			qrCodeId,
			data,
		}: {
			qrCodeId: string;
			data: TUpdateQrCodeShareDto;
		}): Promise<TQrCodeShareResponseDto> => {
			const token = await getToken();
			return apiRequest<TQrCodeShareResponseDto>(`/qr-code/${qrCodeId}/share`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(data),
			});
		},
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({
				queryKey: qrCodeShareQueryKeys.share(variables.qrCodeId),
			});
		},
	});
}

/**
 * Hook to delete a share link.
 */
export function useDeleteQrCodeShareMutation() {
	const { getToken } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (qrCodeId: string): Promise<void> => {
			const token = await getToken();
			await apiRequest<{ deleted: boolean }>(`/qr-code/${qrCodeId}/share`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});
		},
		onSuccess: (_, qrCodeId) => {
			void queryClient.invalidateQueries({
				queryKey: qrCodeShareQueryKeys.share(qrCodeId),
			});
		},
	});
}

/**
 * Fetch a public shared QR code (no auth required).
 * For use in server components.
 */
export async function getPublicSharedQrCode(
	shareToken: string,
	apiUrl: string,
): Promise<TPublicSharedQrCodeResponseDto> {
	const response = await fetch(`${apiUrl}/s/${shareToken}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
		cache: 'no-store',
	});

	if (!response.ok) {
		throw new Error('Share link not found');
	}

	return response.json();
}
