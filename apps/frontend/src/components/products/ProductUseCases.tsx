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
		<div className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
						<Heading as="h2" size="section" className="mb-4">
							{title}
						</Heading>
						<p className="text-slate-600 text-base sm:text-lg">{subtitle}</p>
					</AnimateOnScroll>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{cases.map((c, i) => (
							<AnimateOnScroll key={c.title} delay={i * 0.08}>
								<div className="bg-white rounded-2xl border border-slate-200/60 p-6 sm:p-8 h-full hover:shadow-lg transition-shadow">
									<div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 mb-5">
										{c.icon}
									</div>
									<h3 className="text-lg font-semibold text-slate-900 mb-2">{c.title}</h3>
									<p className="text-slate-600 text-sm leading-relaxed">{c.description}</p>
								</div>
							</AnimateOnScroll>
						))}
					</div>
				</div>
			</Container>
		</div>
	);
}
