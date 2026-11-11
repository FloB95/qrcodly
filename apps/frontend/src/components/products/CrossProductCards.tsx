'use client';

import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { Eyebrow } from '@/components/marketing/SectionHead';
import { Link } from '@/i18n/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export function CrossProductCards({
	title,
	cards,
}: {
	/** Rendered as the eyebrow of every card; the cards carry the headings. */
	title: string;
	cards: Array<{ title: string; description: string; href: string; icon: ReactNode }>;
}) {
	return (
		<section className="py-12 sm:py-16">
			<Container>
				<div className="grid grid-cols-1 gap-5 sm:px-6 md:grid-cols-2 lg:px-8">
					{cards.map((card, i) => (
						<AnimateOnScroll key={card.href} delay={i * 0.08}>
							<Link
								href={card.href}
								className="group flex h-full items-start gap-5 rounded-[22px] bg-linear-to-br from-slate-900 to-slate-800 p-7 text-white sm:p-8"
							>
								<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
									{card.icon}
								</span>
								<span className="flex flex-col gap-1.5">
									<Eyebrow className="text-amber-400">{title}</Eyebrow>
									<span className="flex items-center gap-2 text-xl font-bold tracking-tight">
										{card.title}
										<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
									</span>
									<span className="text-[15px] leading-relaxed text-slate-300">
										{card.description}
									</span>
								</span>
							</Link>
						</AnimateOnScroll>
					))}
				</div>
			</Container>
		</section>
	);
}
