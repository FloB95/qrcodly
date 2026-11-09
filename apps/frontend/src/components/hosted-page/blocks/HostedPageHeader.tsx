import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { THostedPageStyle } from '@shared/schemas';
import { STYLE_TOKENS } from '../theme';

export type HostedPageHeaderProps = {
	style: THostedPageStyle;
	title: string;
	description?: string | null;
	brandName?: string | null;
	logoUrl?: string | null;
	preview?: boolean;
};

/** Brand line, headline and description, laid out per style. Shared by every hosted page type. */
export function HostedPageHeader({
	style,
	title,
	description,
	brandName,
	logoUrl,
	preview,
}: HostedPageHeaderProps) {
	const t = useTranslations('hostedPage');
	const tokens = STYLE_TOKENS[style];
	const shownTitle = title || (preview ? t('pdf.titlePlaceholder') : '');

	return (
		<div className={cn('flex flex-col gap-4', style === 'editorial' && 'items-center text-center')}>
			{(logoUrl || brandName) && (
				<div className={cn('flex items-center gap-3', style === 'editorial' && 'flex-col')}>
					{logoUrl && (
						// eslint-disable-next-line @next/next/no-img-element -- logo lives on the storage CDN
						<img
							referrerPolicy="no-referrer"
							src={logoUrl}
							alt={brandName ?? ''}
							className={cn(
								'shrink-0 bg-[var(--hp-surface)] object-contain ring-1 ring-black/5',
								style === 'editorial' ? 'size-16 rounded-full p-1' : 'size-12 rounded-lg p-0.5',
							)}
						/>
					)}
					{brandName && <p className={cn(tokens.eyebrow, 'text-[var(--hp-ink)]')}>{brandName}</p>}
				</div>
			)}
			<h1
				className={cn(
					'font-hp-display text-balance break-words',
					style === 'editorial' &&
						'text-[2.1rem] leading-[1.08] font-medium tracking-tight @md:text-5xl',
					style === 'gallery' &&
						'text-[1.9rem] leading-[1.1] font-semibold tracking-tight @md:text-4xl',
					style === 'technical' &&
						'text-[1.6rem] leading-[1.15] font-semibold tracking-tight @md:text-3xl',
					!title && 'text-[var(--hp-text-muted)] opacity-60',
				)}
			>
				{shownTitle}
			</h1>
			{description && (
				<p
					className={cn(
						'leading-relaxed whitespace-pre-line text-[var(--hp-text-muted)]',
						style === 'editorial' ? 'max-w-[34ch] text-[16px]' : 'text-[15px]',
					)}
				>
					{description}
				</p>
			)}
		</div>
	);
}
