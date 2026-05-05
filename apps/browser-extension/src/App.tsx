import { useEffect, useRef, useState } from 'react';
import { ClerkProvider, Show, useAuth, useClerk, useUser } from '@clerk/chrome-extension';
import { LogOut, UserCircle2 } from 'lucide-react';
import { useTranslations } from 'use-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
const ACCOUNT_PORTAL_URL =
	import.meta.env.VITE_CLERK_ACCOUNT_PORTAL_URL ?? 'https://accounts.qrcodly.de';
const SIGN_IN_URL = `${ACCOUNT_PORTAL_URL}/sign-in?redirect_url=${encodeURIComponent(FRONTEND_URL)}`;

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
	const t = useTranslations('general');
	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center gap-5 p-8 text-center">
			<QrcodlyLogo size="lg" showText={false} />
			<div className="space-y-1.5">
				<h2 className="text-lg font-semibold tracking-tight">QRcodly</h2>
				<p className="text-sm text-muted-foreground">{t('signInToContinue')}</p>
			</div>
			<Button onClick={() => chrome.tabs.create({ url: SIGN_IN_URL })} className="w-full">
				{t('signIn')}
			</Button>
			<p className="text-xs text-muted-foreground">{t('reopenAfterSignIn')}</p>
		</div>
	);
}

function ProfileAvatar() {
	const { user } = useUser();
	const { signOut } = useClerk();
	const t = useTranslations('general');

	const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? '';

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					className="rounded-full overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
					title={displayName}
				>
					<img
						src={user?.imageUrl}
						alt={displayName || 'Profile'}
						className="h-7 w-7 rounded-full"
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{displayName ? (
					<>
						<DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
						<DropdownMenuSeparator />
					</>
				) : null}
				<DropdownMenuItem
					onClick={() => chrome.tabs.create({ url: `${FRONTEND_URL}/dashboard/settings/profile` })}
				>
					<UserCircle2 className="mr-2 h-4 w-4" />
					{t('openProfile')}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => void signOut()}>
					<LogOut className="mr-2 h-4 w-4" />
					{t('signOut')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
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

function ClerkReadySignal({ onReady }: { onReady?: () => void }) {
	const { isLoaded } = useAuth();
	const called = useRef(false);
	useEffect(() => {
		if (isLoaded && !called.current) {
			called.current = true;
			onReady?.();
		}
	}, [isLoaded, onReady]);
	return null;
}

export default function App({ onReady }: AppProps) {
	const [locale, setLocale] = useState<SupportedLanguages>(getPreferredLocale());
	const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

	useEffect(() => {
		void loadMessages(locale).then(setMessages);
	}, [locale]);

	useEffect(() => {
		const stored = localStorage.getItem('qrcodly-locale') as SupportedLanguages | null;
		if (stored) {
			setLocale(stored);
		}
	}, []);

	if (!messages) {
		return null;
	}

	const clerkLocale = localeMap[locale] || enUS;

	return (
		<ClerkProvider
			publishableKey={PUBLISHABLE_KEY}
			syncHost={FRONTEND_URL}
			afterSignOutUrl="/"
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			localization={clerkLocale as any}
		>
			<IntlProvider locale={locale} messages={messages}>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						<ClerkReadySignal onReady={onReady} />
						<div style={{ width: 470 }}>
							<Show when="signed-in">
								<ExtensionLayout />
							</Show>
							<Show when="signed-out">
								<SignInPrompt />
							</Show>
						</div>
						<Toaster />
					</TooltipProvider>
				</QueryClientProvider>
			</IntlProvider>
		</ClerkProvider>
	);
}
