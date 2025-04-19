import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TCreateConfigTemplateDto,
	TConfigTemplatePaginatedResponseDto,
	TConfigTemplateResponseDto,
} from '@shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils';

// Define query keys
export const queryKeys = {
	myConfigTemplates: ['myConfigTemplates'],
} as const;

// Hook to fetch configuration templates
export function useMyConfigTemplatesQuery() {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: queryKeys.myConfigTemplates,
		queryFn: async (): Promise<TConfigTemplatePaginatedResponseDto> => {
			const token = await getToken();

			return apiRequest<TConfigTemplatePaginatedResponseDto>('/config-template/get-my', {
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

// Function to create a configuration template
export function useCreateConfigTemplateMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (
			configTemplate: TCreateConfigTemplateDto,
		): Promise<TConfigTemplateResponseDto> => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};

			return apiRequest<TConfigTemplateResponseDto>('/config-template', {
				method: 'POST',
				body: JSON.stringify(configTemplate),
				headers,
			});
		},
		onSuccess: () => {
			// Invalidate the 'myConfigTemplates' query to refetch the updated data
			void queryClient.invalidateQueries({ queryKey: [...queryKeys.myConfigTemplates] });
		},
		onError: (error) => {
			console.error('Error creating configuration template:', error);
		},
	});
}

// Function to delete a configuration template
export function useDeleteConfigTemplateMutation() {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: async (configTemplateId: string): Promise<void> => {
			const token = await getToken();
			const headers: HeadersInit = {
				Authorization: `Bearer ${token}`,
			};
			await apiRequest<void>(`/config-template/${configTemplateId}`, {
				method: 'DELETE',
				headers,
			});
		},
		onSuccess: () => {
			// Invalidate the 'myConfigTemplates' query to refetch the updated data
			void queryClient.invalidateQueries({ queryKey: [...queryKeys.myConfigTemplates] });
		},
		onError: (error) => {
			console.error('Error deleting configuration template:', error);
		},
	});
}
