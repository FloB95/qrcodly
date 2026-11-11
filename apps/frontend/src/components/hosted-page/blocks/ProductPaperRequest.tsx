import { EnvelopeIcon } from '@heroicons/react/24/outline';
import type { THostedPageStyle } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { STYLE_TOKENS } from '../theme';

type ProductPaperRequestProps = {
	style: THostedPageStyle;
	email: string;
	button: string;
	/** Line under the button naming the address, for phones without a mail app */
	hint: string;
	subject: string;
	body: string;
	/** The editor preview shows the button but opens nothing */
	disabled?: boolean;
};

/**
 * A paper copy is requested by e-mail to the manufacturer, written in the visitor's own mail app:
 * nothing about the visitor passes through or stays with QRcodly.
 */
export function ProductPaperRequest({
	style,
	email,
	button,
	hint,
	subject,
	body,
	disabled,
}: ProductPaperRequestProps) {
	const tokens = STYLE_TOKENS[style];
	const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

	return (
		<section className="space-y-2">
			<a
				href={disabled ? undefined : href}
				aria-disabled={disabled}
				className={cn(
					'flex w-full items-center justify-center gap-2 bg-[var(--hp-surface)] px-5 font-semibold text-[var(--hp-text)] ring-1 ring-[var(--hp-line)] transition-colors ring-inset hover:bg-[var(--hp-surface-2)]',
					tokens.button,
				)}
			>
				<EnvelopeIcon className="size-4 shrink-0" aria-hidden="true" />
				<span className="truncate">{button}</span>
			</a>
			<p className="text-center text-xs [overflow-wrap:anywhere] text-[var(--hp-text-muted)]">
				{hint}
			</p>
		</section>
	);
}
