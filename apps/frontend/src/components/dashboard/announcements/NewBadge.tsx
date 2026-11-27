'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useNewFeatureBadge } from './use-announcements';

/** The yellow "new" pill, as on the home page tiles. */
export function NewBadge({ className }: { className?: string }) {
	const t = useTranslations('announcements');
	return (
		<span
			className={cn(
				'rounded-full bg-amber-400 px-2 py-0.5 text-[11px] leading-4 font-semibold text-slate-900',
				className,
			)}
		>
			{t('new')}
		</span>
	);
}

/** The pill on a feature itself, while its announcement runs and the user has not opened it yet. */
export function NewFeatureBadge({ announcementId }: { announcementId: string }) {
	const { visible } = useNewFeatureBadge(announcementId);
	return visible ? <NewBadge /> : null;
}
