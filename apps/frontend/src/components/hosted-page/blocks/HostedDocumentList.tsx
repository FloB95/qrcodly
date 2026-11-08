import { ArrowDownTrayIcon, DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { THostedPageStyle } from '@shared/schemas';
import { STYLE_TOKENS } from '../theme';

/** One row of the list; each page type maps its own data to these values. */
export type HostedDocumentItem = {
	id: string;
	title: string;
	/** Small line under the title, e.g. "PDF · 1.2 MB" */
	meta: string;
	openUrl: string;
	downloadUrl: string;
};

type HostedDocumentListProps = {
	style: THostedPageStyle;
	items: HostedDocumentItem[];
	/** Accessible names of the two icon buttons */
	openLabel: string;
	downloadLabel: string;
	className?: string;
};

/**
 * Several documents on one page. A tap on the row opens the document, like the eye next to it;
 * the arrow downloads it. Open and download sit side by side, as on a one-document page.
 */
export function HostedDocumentList({
	style,
	items,
	openLabel,
	downloadLabel,
	className,
}: HostedDocumentListProps) {
	const tokens = STYLE_TOKENS[style];
	// compact on phones, so a long title keeps as many characters as possible; full size from @md
	const iconButton = cn(
		'flex size-9 shrink-0 items-center justify-center text-[var(--hp-ink)] transition-colors hover:bg-[var(--hp-surface-2)] @md:size-10',
		tokens.radius,
	);
	const actionIcon = 'size-[18px] @md:size-5';

	return (
		<ul
			className={cn(
				style === 'editorial' &&
					'divide-y divide-[var(--hp-line)] border-y border-[var(--hp-line)]',
				// grid-cols-1 is minmax(0, 1fr): a long file name truncates instead of widening the card
				style === 'gallery' && 'grid grid-cols-1 gap-3',
				style === 'technical' &&
					'divide-y divide-[var(--hp-line)] border-t border-[var(--hp-line)]',
				className,
			)}
		>
			{items.map((item) => {
				return (
					<li
						key={item.id}
						className={cn(
							'flex items-center gap-1.5 @md:gap-3',
							style === 'editorial' && 'py-3 @md:py-4',
							style === 'gallery' && cn('bg-[var(--hp-surface-2)] p-2.5 @md:p-3', tokens.radius),
							style === 'technical' && 'px-4 py-3 @md:px-5',
						)}
					>
						<a
							href={item.openUrl}
							target="_blank"
							rel="noopener"
							className="flex min-w-0 flex-1 items-center gap-3 @md:gap-4"
						>
							<span
								className={cn(
									'flex shrink-0 items-center justify-center text-[var(--hp-ink)]',
									style === 'editorial'
										? 'size-7 @md:size-10'
										: cn(
												'size-9 bg-[var(--hp-surface)] ring-1 ring-[var(--hp-line)] @md:size-11',
												tokens.radius,
											),
								)}
							>
								<DocumentTextIcon className="size-5 @md:size-6" aria-hidden="true" />
							</span>
							<span className="min-w-0">
								<span
									className={cn(
										'block truncate text-[15px] font-semibold @md:text-base',
										style === 'editorial' && 'font-hp-display text-base font-medium @md:text-lg',
									)}
								>
									{item.title}
								</span>
								<span
									className={cn(
										'block truncate text-xs text-[var(--hp-text-muted)]',
										style === 'technical' && 'font-hp-mono',
									)}
								>
									{item.meta}
								</span>
							</span>
						</a>
						<div className="flex shrink-0 items-center">
							<a
								href={item.openUrl}
								target="_blank"
								rel="noopener"
								aria-label={openLabel}
								title={openLabel}
								className={iconButton}
							>
								<EyeIcon className={actionIcon} aria-hidden="true" />
							</a>
							<a
								href={item.downloadUrl}
								aria-label={downloadLabel}
								title={downloadLabel}
								className={iconButton}
							>
								<ArrowDownTrayIcon className={actionIcon} aria-hidden="true" />
							</a>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
