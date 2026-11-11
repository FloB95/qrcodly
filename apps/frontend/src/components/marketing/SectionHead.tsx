import { CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Shared look of the marketing pages. */
export const eyebrowClass = 'font-mono text-xs font-medium tracking-[0.16em] uppercase';
export const cardClass = 'rounded-[22px] bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]';
export const darkCardClass = 'rounded-[22px] bg-slate-900 text-white';
export const titleClass =
	'text-3xl font-extrabold tracking-tight text-balance hyphens-auto text-slate-900 sm:text-[44px] sm:leading-[1.08]';

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
	return <span className={cn(eyebrowClass, 'text-amber-800', className)}>{children}</span>;
}

export function Check({ className = 'text-teal-600' }: { className?: string }) {
	return (
		<CheckIcon className={cn('size-4 shrink-0', className)} strokeWidth={2.5} aria-hidden="true" />
	);
}

export function SectionHead({
	eyebrow,
	title,
	subtitle,
	dark,
	className,
	children,
}: {
	eyebrow?: string;
	title: string;
	subtitle?: string;
	dark?: boolean;
	className?: string;
	children?: ReactNode;
}) {
	return (
		<div className={cn('mb-10 flex max-w-2xl flex-col gap-3.5 sm:mb-12', className)}>
			{eyebrow && <Eyebrow className={dark ? 'text-amber-400' : undefined}>{eyebrow}</Eyebrow>}
			<h2 className={cn(titleClass, dark && 'text-white')}>{title}</h2>
			{subtitle && (
				<p
					className={cn(
						'text-base leading-relaxed sm:text-lg',
						dark ? 'text-slate-300' : 'text-slate-600',
					)}
				>
					{subtitle}
				</p>
			)}
			{children}
		</div>
	);
}
