'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { LinkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Social provider icons
function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
}

function GitHubIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
		</svg>
	);
}

function AppleIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor">
			<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
		</svg>
	);
}

function MicrosoftIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor">
			<path fill="#F25022" d="M1 1h10v10H1z" />
			<path fill="#00A4EF" d="M1 13h10v10H1z" />
			<path fill="#7FBA00" d="M13 1h10v10H13z" />
			<path fill="#FFB900" d="M13 13h10v10H13z" />
		</svg>
	);
}

function DefaultProviderIcon({ className }: { className?: string }) {
	return <LinkIcon className={className} />;
}

interface ExternalAccount {
	id: string;
	provider: string;
	emailAddress?: string;
	username?: string;
	firstName?: string;
	lastName?: string;
	imageUrl?: string;
	verification?: {
		status: string;
	};
	destroy: () => Promise<void>;
}

function getProviderIcon(provider: string) {
	const iconClass = 'size-5';
	switch (provider.toLowerCase()) {
		case 'google':
		case 'oauth_google':
			return <GoogleIcon className={iconClass} />;
		case 'github':
		case 'oauth_github':
			return <GitHubIcon className={iconClass} />;
		case 'apple':
		case 'oauth_apple':
			return <AppleIcon className={iconClass} />;
		case 'microsoft':
		case 'oauth_microsoft':
			return <MicrosoftIcon className={iconClass} />;
		default:
			return <DefaultProviderIcon className={iconClass} />;
	}
}

function getProviderName(provider: string): string {
	const name = provider.replace('oauth_', '');
	return name.charAt(0).toUpperCase() + name.slice(1);
}

function ConnectedAccountsSkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2].map((i) => (
				<div key={i} className="flex items-center justify-between p-4 rounded-lg border">
					<div className="flex items-center gap-3">
						<Skeleton className="size-10 rounded-lg" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-40" />
						</div>
					</div>
					<Skeleton className="h-8 w-20" />
				</div>
			))}
		</div>
	);
}

interface AccountItemProps {
	account: ExternalAccount;
	canRemove: boolean;
	onRemove: (accountId: string) => Promise<void>;
	t: ReturnType<typeof useTranslations<'settings.profile'>>;
}

function AccountItem({ account, canRemove, onRemove, t }: AccountItemProps) {
	const [isRemoving, setIsRemoving] = useState(false);

	const handleRemove = async () => {
		setIsRemoving(true);
		try {
			await onRemove(account.id);
		} finally {
			setIsRemoving(false);
		}
	};

	const displayName =
		account.username ||
		account.emailAddress ||
		[account.firstName, account.lastName].filter(Boolean).join(' ') ||
		t('unknownAccount');

	return (
		<div className="flex items-center justify-between p-4 rounded-lg border bg-card">
			<div className="flex items-center gap-3">
				<div className="p-2 bg-muted rounded-lg">{getProviderIcon(account.provider)}</div>
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{getProviderName(account.provider)}</span>
						{account.verification?.status === 'verified' && (
							<Badge variant="secondary" className="text-xs">
								{t('verified')}
							</Badge>
						)}
					</div>
					<p className="text-sm text-muted-foreground">{displayName}</p>
				</div>
			</div>

			{canRemove && (
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="ghost" size="sm" disabled={isRemoving}>
							<TrashIcon className="size-4" />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('removeAccountTitle')}</AlertDialogTitle>
							<AlertDialogDescription>
								{t('removeAccountDescription', { provider: getProviderName(account.provider) })}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
							<AlertDialogAction onClick={handleRemove}>{t('removeAccount')}</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}

export function ConnectedAccountsSection() {
	const { user, isLoaded } = useUser();
	const t = useTranslations('settings.profile');
	const [accounts, setAccounts] = useState<ExternalAccount[]>([]);
	const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

	useEffect(() => {
		if (user) {
			// Get external accounts from user
			const externalAccounts = user.externalAccounts as unknown as ExternalAccount[];
			setAccounts(externalAccounts || []);
			setIsLoadingAccounts(false);
		}
	}, [user]);

	const handleRemoveAccount = async (accountId: string) => {
		try {
			const accountToRemove = accounts.find((a) => a.id === accountId);
			if (accountToRemove) {
				await accountToRemove.destroy();
				setAccounts((prev) => prev.filter((a) => a.id !== accountId));
				toast({ title: t('accountRemoved') });
			}
		} catch {
			toast({ title: t('accountRemoveError'), variant: 'destructive' });
		}
	};

	// Check if we can remove accounts (must have at least one auth method)
	const hasPasswordAuth = user?.passwordEnabled ?? false;
	const canRemoveAccounts = accounts.length > 1 || hasPasswordAuth;

	// Don't render if there are no connected accounts (user signed up with email/password)
	if (isLoaded && !isLoadingAccounts && accounts.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<LinkIcon className="size-5" />
					</div>
					<div>
						<CardTitle>{t('connectedAccountsTitle')}</CardTitle>
						<CardDescription>{t('connectedAccountsDescription')}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{!isLoaded || isLoadingAccounts ? (
					<ConnectedAccountsSkeleton />
				) : (
					<div className="space-y-3">
						{accounts.map((account) => (
							<AccountItem
								key={account.id}
								account={account}
								canRemove={canRemoveAccounts}
								onRemove={handleRemoveAccount}
								t={t}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
