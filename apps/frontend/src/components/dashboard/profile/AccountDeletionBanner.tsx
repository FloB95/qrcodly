'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useAccountDeletionRequestQuery } from '@/lib/api/account';

/**
 * Explains the write lock on every dashboard page: once a deletion is requested the API rejects
 * creating and changing, so the user must see why before running into an error.
 */
export function AccountDeletionBanner() {
	const t = useTranslations('settings.profile');
	const locale = useLocale();
	const { data } = useAccountDeletionRequestQuery();

	if (!data?.requestedAt) return null;

	const date = new Date(data.requestedAt).toLocaleDateString(locale, { dateStyle: 'long' });

	return (
		<div
			role="status"
			className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex gap-3 min-w-0">
					<ExclamationTriangleIcon
						aria-hidden="true"
						className="size-5 shrink-0 text-amber-600 dark:text-amber-400"
					/>
					<div className="min-w-0 space-y-1">
						<p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
							{t('deletionBannerTitle')}
						</p>
						<p className="text-sm text-amber-800 dark:text-amber-200">
							{t('deletionBannerDescription', { date })}
						</p>
					</div>
				</div>
				<Button asChild size="sm" variant="outlineStrong" className="shrink-0">
					<Link href="/dashboard/settings/profile">{t('deletionBannerCta')}</Link>
				</Button>
			</div>
		</div>
	);
}
