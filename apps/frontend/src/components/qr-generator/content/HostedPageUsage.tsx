'use client';

import { useTranslations } from 'next-intl';
import { getHostedUsage, type TQrCodeContent } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { useHostedPageUsageQuery } from '@/lib/api/hosted-page';

type UsageRow = { key: 'landingPages' | 'files'; used: number; limit: number };

/**
 * What the plan holds once the draft is saved: every other hosted code of the user plus the draft
 * itself, so the counts move while documents are added or the open mode changes.
 */
export function useHostedPlanRoom(draft: TQrCodeContent, qrCodeId: string | null) {
	const { data: usage } = useHostedPageUsageQuery(qrCodeId);
	if (!usage || usage.plan !== 'pro' || usage.files.limit === 0) {
		return { rows: null, hasRoomForFile: true };
	}

	const added = getHostedUsage(draft);
	const rows: UsageRow[] = [
		{
			key: 'landingPages',
			used: usage.landingPages.used + added.landingPages,
			limit: usage.landingPages.limit,
		},
		{ key: 'files', used: usage.files.used + added.files, limit: usage.files.limit },
	];

	return { rows, hasRoomForFile: usage.files.used + added.files < usage.files.limit };
}

type HostedPageUsageProps = {
	draft: TQrCodeContent;
	qrCodeId: string | null;
	direct: boolean;
};

/** Landing pages, PDFs and files of the plan, counted with the draft as if it were saved. */
export function HostedPageUsage({ draft, qrCodeId, direct }: HostedPageUsageProps) {
	const t = useTranslations('generator.contentSwitch.hosted.usage');
	const { rows } = useHostedPlanRoom(draft, qrCodeId);
	if (!rows) return null;

	const over = rows.some((row) => row.used > row.limit);

	return (
		<div
			className={cn(
				'rounded-lg border px-3 py-2.5',
				over ? 'border-red-200 bg-red-50' : 'bg-white/70',
			)}
		>
			<p className="text-xs font-medium text-muted-foreground">{t('title')}</p>
			<dl className="mt-2 space-y-2">
				{rows.map((row) => {
					const share =
						row.limit > 0 ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 100;
					const rowOver = row.used > row.limit;
					return (
						<div key={row.key}>
							<div className="flex items-baseline justify-between gap-3 text-sm">
								<dt className="font-medium">
									{t(row.key)}
									{row.key === 'files' && (
										<span className="ml-1.5 text-xs font-normal text-muted-foreground">
											{t('filesHint')}
										</span>
									)}
								</dt>
								<dd
									className={cn(
										'tabular-nums',
										rowOver ? 'font-medium text-red-700' : 'text-muted-foreground',
									)}
								>
									{t('count', { used: row.used, limit: row.limit })}
								</dd>
							</div>
							<div
								className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
								role="progressbar"
								aria-valuemin={0}
								aria-valuemax={row.limit}
								aria-valuenow={row.used}
								aria-label={t(row.key)}
							>
								<div
									className={cn(
										'h-full rounded-full transition-[width]',
										rowOver ? 'bg-red-500' : share >= 80 ? 'bg-amber-500' : 'bg-slate-900',
									)}
									style={{ width: `${share}%` }}
								/>
							</div>
						</div>
					);
				})}
			</dl>
			{(over || direct) && (
				<p className={cn('mt-2 text-xs', over ? 'text-red-700' : 'text-muted-foreground')}>
					{over ? t('over') : t('directHint')}
				</p>
			)}
		</div>
	);
}
