import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'use-intl';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { getQueryClient } from './lib/queryClient';
import { loadMessages, getPreferredLocale } from './lib/i18n';
import type { SupportedLanguages } from './shims/i18n-routing';
import { deDE, enUS, frFR, itIT, esES, nlNL, plPL, ruRU } from '@clerk/localizations';
import { shadcn } from '@clerk/themes';
import DashboardLayout from './layouts/DashboardLayout';
import QrCodesPage from './pages/QrCodesPage';
import CreateQrCodePage from './pages/CreateQrCodePage';
import QrCodeDetailPage from './pages/QrCodeDetailPage';
import QrCodeEditPage from './pages/QrCodeEditPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateEditPage from './pages/TemplateEditPage';
import TagsPage from './pages/TagsPage';
import SettingsProfilePage from './pages/SettingsProfilePage';
import SettingsSecurityPage from './pages/SettingsSecurityPage';
import SettingsBillingPage from './pages/SettingsBillingPage';
import SettingsApiKeysPage from './pages/SettingsApiKeysPage';
import SettingsDomainsPage from './pages/SettingsDomainsPage';
import NotFoundPage from './pages/NotFoundPage';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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

// Component to handle IPC navigation from main process
function NavigationListener() {
	const navigate = useNavigate();

	useEffect(() => {
		if (window.electronAPI?.onNavigate) {
			return window.electronAPI.onNavigate((path: string) => {
				void navigate(path);
			});
		}
	}, [navigate]);

	return null;
}

export default function App() {
	const [locale, setLocale] = useState<SupportedLanguages>(getPreferredLocale());
	const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

	useEffect(() => {
		void loadMessages(locale).then(setMessages);
	}, [locale]);

	// Detect system locale changes
	useEffect(() => {
		const stored = localStorage.getItem('qrcodly-locale') as SupportedLanguages | null;
		if (stored) {
			setLocale(stored);
		}
	}, []);

	if (!messages) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	const clerkLocale = localeMap[locale] || enUS;

	return (
		<ClerkProvider
			publishableKey={clerkPublishableKey}
			localization={clerkLocale}
			appearance={{ theme: shadcn }}
		>
			<IntlProvider locale={locale} messages={messages}>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						<HashRouter>
							<NavigationListener />
							<SignedIn>
								<Routes>
									<Route path="/dashboard" element={<DashboardLayout />}>
										<Route index element={<></>} />
										<Route path="qr-codes" element={<QrCodesPage />} />
										<Route path="qr-codes/create" element={<CreateQrCodePage />} />
										<Route path="qr-codes/:id" element={<QrCodeDetailPage />} />
										<Route path="qr-codes/:id/edit" element={<QrCodeEditPage />} />
										<Route path="templates" element={<TemplatesPage />} />
										<Route path="templates/:id/edit" element={<TemplateEditPage />} />
										<Route path="tags" element={<TagsPage />} />
										<Route path="settings/profile" element={<SettingsProfilePage />} />
										<Route path="settings/security" element={<SettingsSecurityPage />} />
										<Route path="settings/billing" element={<SettingsBillingPage />} />
										<Route path="settings/api-keys" element={<SettingsApiKeysPage />} />
										<Route path="settings/domains" element={<SettingsDomainsPage />} />
									</Route>
									<Route path="/" element={<Navigate to="/dashboard/qr-codes" replace />} />
									<Route path="*" element={<NotFoundPage />} />
								</Routes>
							</SignedIn>
							<SignedOut>
								<div className="flex items-center justify-center min-h-screen bg-background">
									<SignIn routing="hash" />
								</div>
							</SignedOut>
						</HashRouter>
						<Toaster />
					</TooltipProvider>
				</QueryClientProvider>
			</IntlProvider>
		</ClerkProvider>
	);
}
