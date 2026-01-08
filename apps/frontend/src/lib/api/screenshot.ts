import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { convertBlobToDataUrl } from '../screenshot.utils';
import { env } from '@/env';
import { ApiError } from './ApiError';

interface ScreenshotRequestDto {
	url: string;
}

/**
 * Hook to capture a website screenshot via backend API
 */
export function useScreenshotMutation() {
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (dto: ScreenshotRequestDto): Promise<string> => {
			const token = await getToken();

			// We need to handle the blob response differently from JSON
			// So we use fetch directly but follow the same error pattern as apiRequest
			const response = await fetch(
				`${env.NEXT_PUBLIC_API_URL}/qr-code/screenshot?url=${encodeURIComponent(dto.url)}`,
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (!response.ok) {
				const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
				throw new ApiError(
					(errorBody?.message as string | undefined) ?? 'Failed to capture screenshot',
					response.status,
				);
			}

			// Get the blob and convert to data URL
			const blob = await response.blob();
			return convertBlobToDataUrl(blob);
		},
	});
}
