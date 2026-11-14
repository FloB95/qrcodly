import type { ReactNode } from 'react';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { THostedPageStyle } from '@shared/schemas';
import { STYLE_TOKENS } from '../theme';

type ButtonProps = {
	style: THostedPageStyle;
	href: string;
	children: ReactNode;
	icon?: ReactNode;
	external?: boolean;
	className?: string;
};

const target = (external?: boolean) => (external ? { target: '_blank', rel: 'noopener' } : {});

/** Label centred, icon in a small chip at the end: the same silhouette for all three buttons. */
function Shell({
	style,
	href,
	children,
	icon,
	external,
	className,
	chipClassName,
}: ButtonProps & { chipClassName: string }) {
	const tokens = STYLE_TOKENS[style];
	return (
		<a
			href={href}
			{...target(external)}
			className={cn(
				'group relative flex w-full items-center justify-center font-semibold transition-[filter,transform] hover:brightness-[1.06] active:scale-[0.99]',
				icon ? 'pr-12 pl-5' : 'px-5',
				tokens.button,
				className,
			)}
		>
			<span className="truncate">{children}</span>
			{icon && (
				<span
					aria-hidden="true"
					className={cn(
						'absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center transition-transform group-hover:translate-x-0.5',
						style === 'technical' ? 'rounded-md' : 'rounded-full',
						chipClassName,
					)}
				>
					{icon}
				</span>
			)}
		</a>
	);
}

/** The one action a scanner came for, in the owner's primary colour. */
export function HostedPrimaryButton(props: ButtonProps) {
	return (
		<Shell
			{...props}
			className={cn(
				'bg-[var(--hp-primary)] text-[var(--hp-on-primary)] shadow-[0_16px_32px_-16px_var(--hp-primary)]',
				props.className,
			)}
			chipClassName="bg-white/15 text-[var(--hp-on-primary)]"
		/>
	);
}

/** Quiet companion to the primary action, e.g. download next to open. */
export function HostedSecondaryButton(props: ButtonProps) {
	return (
		<Shell
			{...props}
			className={cn(
				'bg-[var(--hp-surface)] text-[var(--hp-text)] ring-1 ring-[var(--hp-line)] ring-inset',
				props.className,
			)}
			chipClassName="bg-[var(--hp-surface-2)] text-[var(--hp-ink)]"
		/>
	);
}

/** Outlined link in the accent colour, for "book a table" or "contact us". */
export function HostedLinkButton({
	style,
	href,
	children,
	className,
}: Omit<ButtonProps, 'icon' | 'external'>) {
	return (
		<Shell
			style={style}
			href={href}
			external
			icon={<ArrowUpRightIcon className="size-4" aria-hidden="true" />}
			className={cn(
				'bg-transparent text-[var(--hp-ink)] ring-[1.5px] ring-[var(--hp-accent)] ring-inset',
				className,
			)}
			chipClassName="bg-[var(--hp-accent)] text-[var(--hp-on-accent)]"
		>
			{children}
		</Shell>
	);
}
