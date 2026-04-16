import { useEffect, useRef, useState } from 'react';
import { ClerkProvider, SignedIn, SignedOut, useUser } from '@clerk/chrome-extension';
import { QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'use-intl';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { QrcodlyLogo } from '@/components/QrcodlyLogo';
import { getQueryClient } from '@ext/lib/queryClient';
import { loadMessages, getPreferredLocale } from '@ext/lib/i18n';
import type { SupportedLanguages } from '@ext/shims/i18n-routing';
import { deDE, enUS, frFR, itIT, esES, nlNL, plPL, ruRU } from '@clerk/localizations';
import { ExtensionQrGenerator } from '@ext/components/ExtensionQrGenerator';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL ?? 'https://www.qrcodly.de';

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

function SignInPrompt() {
	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center gap-5 p-8 text-center">
			<QrcodlyLogo size="lg" showText={false} />
			<div className="space-y-1.5">
				<h2 className="text-lg font-semibold tracking-tight">Sign in to QRcodly</h2>
				<p className="text-sm text-muted-foreground">
					Sign in at qrcodly.de first, then reopen this popup.
				</p>
			</div>
			<Button onClick={() => chrome.tabs.create({ url: FRONTEND_URL })}>Open qrcodly.de</Button>
		</div>
	);
}

function ProfileAvatar() {
	const { user } = useUser();
	return (
		<button
			onClick={() => chrome.tabs.create({ url: `${FRONTEND_URL}/dashboard/settings/profile` })}
			className="rounded-full overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
			title="Open profile"
		>
			<img
				src={user?.imageUrl}
				alt={user?.fullName ?? 'Profile'}
				className="h-7 w-7 rounded-full"
			/>
		</button>
	);
}

function ExtensionLayout() {
	return (
		<div className="flex flex-col">
			<header className="flex items-center justify-between border-b bg-white/90 px-4 py-2 backdrop-blur">
				<QrcodlyLogo size="sm" />
				<ProfileAvatar />
			</header>
			<div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(600px - 49px)' }}>
				<ExtensionQrGenerator />
			</div>
		</div>
	);
}

type AppProps = {
	onReady?: () => void;
};

export default function App({ onReady }: AppProps) {
	const [locale, setLocale] = useState<SupportedLanguages>(getPreferredLocale());
	const [messages, setMessages] = useState<Record<string, unknown> | null>(null);
	const calledReady = useRef(false);

	useEffect(() => {
		void loadMessages(locale).then(setMessages);
	}, [locale]);

	useEffect(() => {
		const stored = localStorage.getItem('qrcodly-locale') as SupportedLanguages | null;
		if (stored) {
			setLocale(stored);
		}
	}, []);

	// Signal ready once messages are loaded
	useEffect(() => {
		if (messages && !calledReady.current) {
			calledReady.current = true;
			onReady?.();
		}
	}, [messages, onReady]);

	// Don't render anything until messages load — the HTML splash screen is visible
	if (!messages) {
		return null;
	}

	const clerkLocale = localeMap[locale] || enUS;

	return (
		<ClerkProvider
			publishableKey={PUBLISHABLE_KEY}
			syncHost="https://www.qrcodly.de"
			afterSignOutUrl="/"
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			localization={clerkLocale as any}
		>
			<IntlProvider locale={locale} messages={messages}>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						<div style={{ width: 470 }}>
							<SignedIn>
								<ExtensionLayout />
							</SignedIn>
							<SignedOut>
								<SignInPrompt />
							</SignedOut>
						</div>
						<Toaster />
					</TooltipProvider>
				</QueryClientProvider>
			</IntlProvider>
		</ClerkProvider>
	);
}
