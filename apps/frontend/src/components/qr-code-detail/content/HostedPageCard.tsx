'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowTopRightOnSquareIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { usePublicHostedPageQuery } from '@/lib/api/hosted-page';
import { useShortUrlLink } from '@/hooks/use-short-url-link';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { getQrCodeEditLink } from '@/lib/utils';
import { CopyUrlButton } from '@/components/dashboard/qrCode/content-renderers/CopyUrlButton';
import { TruncatedLink } from '@/components/dashboard/qrCode/content-renderers/TruncatedLink';

type HostedPageCardProps = {
	qrCode: TQrCodeWithRelationsResponseDto;
	shortCode: string;
	/** What the page holds, from its page type */
	children?: ReactNode;
};

/**
 * Page link, edit shortcut and what the page holds. The preview of what a scanner sees lives in
 * the output column, behind the "QR code | page" switch. The link is the short URL in the QR
 * code, the only address the page is served at.
 */
export function HostedPageCard({ qrCode, shortCode, children }: HostedPageCardProps) {
	const t = useTranslations('qrCode.hostedPage');
	const { link } = useShortUrlLink(qrCode.shortUrl);
	const pageUrl = link ?? '';
	const live = usePublicHostedPageQuery(shortCode);
	const { hasProPlan, isLoading: planLoading } = useHasProPlan();

	return (
		<div className="space-y-6">
			<section className="space-y-3">
				<p className="text-sm font-semibold">{t('title')}</p>
				<div>
					<p className="mb-1 text-xs text-muted-foreground">{t('link')}</p>
					<div className="group/url flex min-w-0 items-center gap-1">
						<TruncatedLink href={pageUrl} className="truncate text-foreground hover:underline" />
						<CopyUrlButton url={pageUrl} />
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<a
						href={pageUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={buttonVariants({ size: 'sm', variant: 'outlineStrong' })}
					>
						<ArrowTopRightOnSquareIcon className="mr-1.5 size-4" />
						{t('open')}
					</a>
					<Link href={getQrCodeEditLink(qrCode.id)} className={buttonVariants({ size: 'sm' })}>
						<PencilIcon className="mr-1.5 size-4" />
						{t('edit')}
					</Link>
				</div>
				{live.data?.status === 'disabled' && (
					<p className="text-sm text-amber-700">
						{!planLoading && !hasProPlan ? t('offlineWithoutPro') : t('disabled')}
					</p>
				)}
				{(live.isError || live.data?.status === 'unavailable') && (
					<p className="text-sm text-muted-foreground">{t('loadError')}</p>
				)}
			</section>
			{children && <div className="border-t pt-6">{children}</div>}
		</div>
	);
}
