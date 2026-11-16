'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { Button, buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useConfirmAccountDeletionMutation } from '@/lib/api/account';
import type { ApiError } from '@/lib/api/ApiError';

const WARNINGS = [
	'deletionWarning1',
	'deletionWarning2',
	'deletionWarning3',
	'deletionWarning4',
] as const;

const PROFILE_PATH = '/dashboard/settings/profile';

/**
 * Landing page of the link in the confirmation mail. The deletion is only confirmed by the button,
 * never by opening the page, so a mail scanner that follows the link cannot confirm it. The secret
 * travels in the URL fragment and is read here in the browser.
 */
export function ConfirmAccountDeletion() {
	const t = useTranslations('accountDeletionConfirm');
	const tProfile = useTranslations('settings.profile');
	const confirm = useConfirmAccountDeletionMutation();
	// undefined until the fragment is read, null when the link carries no secret
	const [token, setToken] = useState<string | null>();

	useEffect(() => {
		setToken(new URLSearchParams(window.location.hash.slice(1)).get('token'));
	}, []);

	if (token === undefined) return null;

	const linkInvalid =
		token === null ||
		(confirm.error as ApiError | null)?.errorCode === 'ACCOUNT_DELETION_LINK_INVALID';

	if (confirm.isSuccess || linkInvalid) {
		return (
			<div className="mx-auto max-w-xl text-center">
				<h1 className="mb-6 text-2xl sm:text-4xl font-semibold">
					{confirm.isSuccess ? t('confirmedTitle') : t('invalidTitle')}
				</h1>
				<p className="mb-10 text-lg text-gray-700">
					{confirm.isSuccess ? t('confirmedDescription') : t('invalidDescription')}
				</p>
				<Link href={PROFILE_PATH} className={buttonVariants()}>
					{t('profileButton')}
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-xl text-center">
			<h1 className="mb-6 text-2xl sm:text-4xl font-semibold">{t('title')}</h1>
			<p className="mb-6 text-lg text-gray-700">{t('description')}</p>
			<div className="mb-8 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left text-sm text-destructive">
				<p className="mb-1 font-medium">{tProfile('deletionWarningTitle')}</p>
				<ul className="list-inside list-disc space-y-1 text-destructive/80">
					{WARNINGS.map((key) => (
						<li key={key}>{tProfile(key)}</li>
					))}
				</ul>
			</div>
			{confirm.isError && (
				<p role="alert" className="mb-4 text-sm text-destructive">
					{tProfile('deletionError')}
				</p>
			)}
			<Button
				variant="destructive"
				onClick={() =>
					confirm.mutate(token, {
						onSuccess: () => posthog.capture('account:deletion-confirmed'),
					})
				}
				isLoading={confirm.isPending}
			>
				{t('confirmButton')}
			</Button>
		</div>
	);
}
