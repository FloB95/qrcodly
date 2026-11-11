'use client';

import Container from '@/components/ui/container';
import { AnimateOnLoad } from '@/components/features/AnimateOnScroll';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';

export function ProductHeroSection({
	eyebrow,
	title,
	subtitle,
	ctaLabel,
	ctaHref,
	secondaryCtaLabel,
	secondaryCtaHref,
	chips,
	visual,
	children,
}: {
	eyebrow?: string;
	title: string;
	subtitle: string;
	ctaLabel?: string;
	ctaHref?: string;
	secondaryCtaLabel?: string;
	secondaryCtaHref?: string;
	chips?: string[];
	/** Scene on the right; the hero falls back to one centred column without it. */
	visual?: ReactNode;
	children?: ReactNode;
}) {
	const actions =
		children ??
		(ctaLabel && ctaHref ? (
			<div className="flex flex-wrap gap-3">
				<Link
					href={ctaHref}
					className={buttonVariants({
						size: 'lg',
						className: 'shadow-[0_14px_30px_-14px_rgba(15,23,42,0.7)]',
					})}
				>
					{ctaLabel}
				</Link>
				{secondaryCtaLabel && secondaryCtaHref && (
					<Link
						href={secondaryCtaHref}
						className={buttonVariants({
							size: 'lg',
							variant: 'outline',
							className: 'bg-white/70',
						})}
					>
						{secondaryCtaLabel}
					</Link>
				)}
			</div>
		) : null);

	return (
		<Container>
			<div className="grid grid-cols-1 items-center gap-12 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-24 lg:grid-cols-2 lg:gap-14 lg:px-8">
				<AnimateOnLoad className="flex min-w-0 flex-col gap-6 sm:gap-7">
					{eyebrow && (
						<span className="self-start rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-900 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)]">
							{eyebrow}
						</span>
					)}
					<h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance hyphens-auto text-slate-900 sm:text-5xl lg:text-[64px] lg:leading-[1.02]">
						{title}
					</h1>
					<p className="max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">{subtitle}</p>
					{actions}
					{chips && chips.length > 0 && (
						<ul className="flex flex-wrap gap-2">
							{chips.map((chip) => (
								<li
									key={chip}
									className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider text-slate-700 uppercase"
								>
									{chip}
								</li>
							))}
						</ul>
					)}
				</AnimateOnLoad>
				{visual && (
					<AnimateOnLoad delay={0.15} className="min-w-0">
						{visual}
					</AnimateOnLoad>
				)}
			</div>
		</Container>
	);
}
