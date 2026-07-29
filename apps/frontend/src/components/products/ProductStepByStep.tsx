'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';

export function ProductStepByStep({
	title,
	subtitle,
	steps,
}: {
	title: string;
	subtitle?: string;
	steps: Array<{ title: string; description: string }>;
}) {
	return (
		<div className="py-16 sm:py-24 bg-slate-50">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
						<Heading as="h2" size="section" className="mb-4">
							{title}
						</Heading>
						{subtitle && <p className="text-slate-600 text-base sm:text-lg">{subtitle}</p>}
					</AnimateOnScroll>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
						{steps.map((step, i) => (
							<AnimateOnScroll key={step.title} delay={i * 0.08}>
								<div className="relative rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 h-full shadow-sm">
									<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold mb-4">
										{i + 1}
									</div>
									<h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
									<p className="text-slate-600 text-base leading-relaxed">{step.description}</p>
								</div>
							</AnimateOnScroll>
						))}
					</div>
				</div>
			</Container>
		</div>
	);
}
