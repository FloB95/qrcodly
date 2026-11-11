'use client';

import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { SectionHead, cardClass } from '@/components/marketing/SectionHead';
import { Link } from '@/i18n/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function ProductUseCases({
	eyebrow,
	title,
	subtitle,
	cases,
	learnMoreLabel,
}: {
	eyebrow?: string;
	title: string;
	subtitle: string;
	cases: Array<{ icon: ReactNode; title: string; description: string; href?: string }>;
	learnMoreLabel?: string;
}) {
	return (
		<section className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{cases.map((c, i) => {
							const card = (
								<div
									className={cn(
										cardClass,
										'group flex h-full flex-col gap-3 p-6 transition-transform duration-300 sm:p-7',
										c.href && 'hover:-translate-y-0.5',
									)}
								>
									<span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
										{c.icon}
									</span>
									<h3 className="text-lg font-bold tracking-tight text-slate-900">{c.title}</h3>
									<p className="text-[15px] leading-relaxed text-slate-600">{c.description}</p>
									{c.href && learnMoreLabel && (
										<span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-slate-900">
											{learnMoreLabel}
											<ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" />
										</span>
									)}
								</div>
							);

							return (
								<AnimateOnScroll key={c.title} delay={(i % 3) * 0.08}>
									{c.href ? (
										<Link href={c.href} className="block h-full">
											{card}
										</Link>
									) : (
										card
									)}
								</AnimateOnScroll>
							);
						})}
					</div>
				</div>
			</Container>
		</section>
	);
}
