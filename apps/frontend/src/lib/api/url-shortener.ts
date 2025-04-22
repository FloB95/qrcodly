import { useAuth } from '@clerk/nextjs';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../utils';
import type { TShortUrl } from '@shared/schemas';

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
