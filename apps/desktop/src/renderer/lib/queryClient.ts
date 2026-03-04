import { QueryClient } from '@tanstack/react-query';

let queryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
	queryClient ??= new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000,
			},
		},
	});
	return queryClient;
}
