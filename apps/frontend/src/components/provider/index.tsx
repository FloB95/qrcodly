'use client';
import { getQueryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { TooltipProvider } from '../ui/tooltip';
import { PostHogProvider } from './PostHogProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<PostHogProvider>
				<TooltipProvider>{children}</TooltipProvider>
			</PostHogProvider>
		</QueryClientProvider>
	);
}
