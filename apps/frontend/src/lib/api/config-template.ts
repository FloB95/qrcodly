import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
	TCreateConfigTemplateDto,
	TConfigTemplatePaginatedResponseDto,
	TConfigTemplateResponseDto,
	TUpdateConfigTemplateDto,
} from '@shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';

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
export function useListConfigTemplatesQuery(searchName?: string, page = 1, limit = 10) {
	const { getToken } = useAuth();

	return useQuery({
		queryKey: [...queryKeys.listConfigTemplates, searchName, page, limit],
		queryFn: async (): Promise<TConfigTemplatePaginatedResponseDto> => {
			const token = await getToken();

			const queryParams: Record<string, unknown> = {
				page,
				limit,
			};

			if (searchName !== undefined) {
				queryParams.where = {
					name: {
						like: searchName,
					},
				};
			}

			return apiRequest<TConfigTemplatePaginatedResponseDto>(
				'/config-template',
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
		onSuccess: async () => {
			// Invalidate the 'listConfigTemplates' query to refetch the updated data
			await queryClient.invalidateQueries({
				queryKey: queryKeys.listConfigTemplates,
			});
		},
		onError: (error) => {
			console.error('Error creating configuration template:', error);
		},
	});
}

export function useUpdateConfigTemplateMutation() {
	const t = useTranslations('templates');
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	return useMutation<
		TConfigTemplateResponseDto, // TData
		Error, // TError
		{ configTemplateId: string; data: TUpdateConfigTemplateDto }
	>({
		mutationFn: async ({ configTemplateId, data }) => {
			const token = await getToken();
			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
			return apiRequest<TConfigTemplateResponseDto>(`/config-template/${configTemplateId}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
				headers,
			});
		},
		onSuccess: (data) => {
			toast({
				title: t('update.successTitle'),
				description: t('update.successDescription'),
				duration: 5000,
			});

			posthog.capture('config-template-updated', {
				name: data.name,
				config: data.config,
			});

			void queryClient.invalidateQueries({
				queryKey: queryKeys.listConfigTemplates,
			});
		},
		onError: (e) => {
			toast({
				variant: 'destructive',
				title: t('update.errorTitle'),
				description: t('update.errorDescription'),
				duration: 5000,
			});

			posthog.capture('error:config-template-updated', {
				error: e,
			});
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
