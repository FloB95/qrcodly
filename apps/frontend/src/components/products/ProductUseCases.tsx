'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { Link } from '@/i18n/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export function ProductUseCases({
	title,
	subtitle,
	cases,
	learnMoreLabel,
}: {
	title: string;
	subtitle: string;
	cases: Array<{ icon: ReactNode; title: string; description: string; href?: string }>;
	learnMoreLabel?: string;
}) {
	return (
		<div className="py-16 sm:py-24 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
			{/* Subtle radial glow accent */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-slate-600/10 rounded-full blur-3xl pointer-events-none" />

			<Container>
				<div className="sm:px-6 lg:px-8 relative">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
						<Heading as="h2" size="section" className="mb-4 text-white">
							{title}
						</Heading>
						<p className="text-slate-300 text-base sm:text-lg">{subtitle}</p>
					</AnimateOnScroll>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
						{cases.map((c, i) => {
							const card = (
								<div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-6 sm:p-8 h-full transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5">
									<div className="w-11 h-11 rounded-xl bg-white/[0.08] flex items-center justify-center text-slate-300 mb-5 transition-colors duration-300 group-hover:bg-white/[0.12] group-hover:text-white">
										{c.icon}
									</div>
									<h3 className="text-lg font-semibold text-white mb-2">{c.title}</h3>
									<p className="text-slate-300 text-base leading-relaxed">{c.description}</p>
									{c.href && learnMoreLabel && (
										<span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-teal-400 transition-colors group-hover:text-teal-300">
											{learnMoreLabel}
											<ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
										</span>
									)}
								</div>
							);

							return (
								<AnimateOnScroll key={c.title} delay={i * 0.08}>
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
		</div>
	);
}
