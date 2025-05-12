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
	listConfigTemplates: ['listConfigTemplates'],
	predefinedTemplates: ['predefinedTemplates'],
} as const;

// Hook to fetch predefined configuration templates
export function usePredefinedTemplatesQuery() {
	return useQuery({
		queryKey: queryKeys.predefinedTemplates,
		queryFn: async (): Promise<TConfigTemplatePaginatedResponseDto> => {
			return apiRequest<TConfigTemplatePaginatedResponseDto>('/config-template/predefined', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
		},
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});
}

// Hook to fetch configuration templates
export function useListConfigTemplatesQuery(searchName?: string) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...queryKeys.listConfigTemplates, searchName],
		queryFn: async (): Promise<TConfigTemplatePaginatedResponseDto> => {
			const token = await getToken();

			return apiRequest<TConfigTemplatePaginatedResponseDto>(
				`/config-template`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				},
				{
					where: {
						name: {
							like: searchName ?? '',
						},
					},
					limit: 20,
				},
			);
		},
		refetchOnMount: false,
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
			// Invalidate the 'listConfigTemplates' query to refetch the updated data
			void queryClient.invalidateQueries({
				queryKey: queryKeys.listConfigTemplates,
			});
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
			// Invalidate the 'listConfigTemplates' query to refetch the updated data
			void queryClient.invalidateQueries({
				queryKey: queryKeys.listConfigTemplates,
			});
		},
		onError: (error) => {
			console.error('Error deleting configuration template:', error);
		},
	});
}
