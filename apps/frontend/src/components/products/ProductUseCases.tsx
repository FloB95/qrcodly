'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import type { ReactNode } from 'react';

export function ProductUseCases({
	title,
	subtitle,
	cases,
}: {
	title: string;
	subtitle: string;
	cases: Array<{ icon: ReactNode; title: string; description: string }>;
}) {
	return (
		<div className="py-16 sm:py-24 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-card dark:via-card dark:to-card relative overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
			{/* Subtle radial glow accent */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-slate-600/10 rounded-full blur-3xl pointer-events-none" />

			<Container>
				<div className="sm:px-6 lg:px-8 relative">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
						<Heading as="h2" size="section" className="mb-4 text-white">
							{title}
						</Heading>
						<p className="text-muted-foreground text-base sm:text-lg">{subtitle}</p>
					</AnimateOnScroll>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
						{cases.map((c, i) => (
							<AnimateOnScroll key={c.title} delay={i * 0.08}>
								<div className="group relative rounded-2xl border border-white/[0.08] bg-card/[0.04] backdrop-blur-sm p-6 sm:p-8 h-full transition-all duration-300 hover:bg-card/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5">
									<div className="w-11 h-11 rounded-xl bg-card/[0.08] flex items-center justify-center text-muted-foreground mb-5 transition-colors duration-300 group-hover:bg-card/[0.12] group-hover:text-white">
										{c.icon}
									</div>
									<h3 className="text-lg font-semibold text-white mb-2">{c.title}</h3>
									<p className="text-muted-foreground text-base leading-relaxed">{c.description}</p>
								</div>
							</AnimateOnScroll>
						))}
					</div>
				</div>
			</Container>
		</div>
	);
}
