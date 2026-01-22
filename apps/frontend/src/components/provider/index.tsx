'use client';
import { getQueryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { TooltipProvider } from '../ui/tooltip';
import { PostHogProvider } from './PostHogProvider';
import { ClerkProvider } from '@clerk/nextjs';
import type { SupportedLanguages } from '@/i18n/routing';
import { deDE, enUS, frFR, itIT, esES, nlNL, plPL, ruRU } from '@clerk/localizations';
import { shadcn } from '@clerk/themes';

export default function Providers({
	locale,
	children,
}: {
	locale?: SupportedLanguages;
	children: React.ReactNode;
}) {
	const queryClient = getQueryClient();

	const localeMap: Record<string, typeof enUS> = {
		en: enUS,
		de: deDE,
		nl: nlNL,
		fr: frFR,
		it: itIT,
		es: esES,
		pl: plPL,
		ru: ruRU,
	};

	const clerkLocale = locale ? localeMap[locale] || enUS : enUS;

	return (
		<ClerkProvider
			localization={clerkLocale}
			appearance={{
				theme: shadcn,
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
