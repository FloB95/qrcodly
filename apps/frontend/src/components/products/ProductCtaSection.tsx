'use client';

import Container from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';

export function ProductCtaSection({
	title,
	subtitle,
	ctaLabel,
	ctaHref,
}: {
	title: string;
	subtitle: string;
	ctaLabel: string;
	ctaHref: string;
}) {
	return (
		<section className="pt-12 pb-20 sm:pt-16 sm:pb-28">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="relative flex flex-col gap-8 overflow-hidden rounded-[32px] bg-slate-900 px-6 py-12 text-white sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
						<div
							aria-hidden="true"
							className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-[radial-gradient(circle,rgba(253,223,188,0.28),transparent_70%)]"
						/>
						<div className="relative flex max-w-2xl flex-col gap-3.5">
							<h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-[42px] sm:leading-[1.08]">
								{title}
							</h2>
							<p className="text-base leading-relaxed text-slate-300 sm:text-lg">{subtitle}</p>
						</div>
						<Link
							href={ctaHref}
							className="relative inline-flex shrink-0 items-center justify-center self-start rounded-xl bg-white px-6 py-4 text-base font-bold text-slate-900 transition-colors hover:bg-[#fddfbc] lg:self-auto"
						>
							{ctaLabel}
						</Link>
					</AnimateOnScroll>
				</div>
			</Container>
		</section>
	);
}
