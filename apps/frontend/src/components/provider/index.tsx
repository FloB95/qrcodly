'use client';
import { getQueryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { TooltipProvider } from '../ui/tooltip';
import { PostHogProvider } from './PostHogProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { signInPath, signUpPath, type SupportedLanguages } from '@/i18n/routing';
import { getClerkLocalization } from '@/lib/clerk-localization';
import { shadcn } from '@clerk/themes';
import { authAppearance } from '@/lib/clerk-appearance';

export default function Providers({
	locale,
	children,
}: {
	locale?: SupportedLanguages;
	children: React.ReactNode;
}) {
	const queryClient = getQueryClient();

	return (
		<ClerkProvider
			localization={getClerkLocalization(locale)}
			signInUrl={signInPath(locale)}
			signUpUrl={signUpPath(locale)}
			appearance={{
				theme: shadcn,
				signIn: authAppearance,
				signUp: authAppearance,
			}}
		>
			<QueryClientProvider client={queryClient}>
				<PostHogProvider>
					<TooltipProvider>{children}</TooltipProvider>
				</PostHogProvider>
			</QueryClientProvider>
		</ClerkProvider>
	);
}
