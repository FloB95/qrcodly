'use client';
import { getQueryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { TooltipProvider } from '../ui/tooltip';
import { PostHogProvider } from './PostHogProvider';
import { QrCodeGeneratorStoreProvider } from './QrCodeConfigStoreProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<PostHogProvider>
				<QrCodeGeneratorStoreProvider>
					<TooltipProvider>{children}</TooltipProvider>
				</QrCodeGeneratorStoreProvider>
			</PostHogProvider>
		</QueryClientProvider>
	);
}
