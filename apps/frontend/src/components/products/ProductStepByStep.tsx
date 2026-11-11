'use client';

import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { SectionHead, cardClass } from '@/components/marketing/SectionHead';
import { cn } from '@/lib/utils';

export function ProductStepByStep({
	eyebrow,
	title,
	subtitle,
	steps,
}: {
	eyebrow?: string;
	title: string;
	subtitle?: string;
	steps: Array<{ title: string; description: string }>;
}) {
	return (
		<section className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />
					<ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
						{steps.map((step, i) => (
							<li key={step.title}>
								<AnimateOnScroll
									delay={(i % 5) * 0.06}
									className={cn(cardClass, 'flex h-full flex-col gap-3 p-6')}
								>
									<span className="font-mono text-sm font-medium text-amber-800">
										{String(i + 1).padStart(2, '0')}
									</span>
									<h3 className="text-lg font-bold tracking-tight text-slate-900">{step.title}</h3>
									<p className="text-[15px] leading-relaxed text-slate-600">{step.description}</p>
								</AnimateOnScroll>
							</li>
						))}
					</ol>
				</div>
			</Container>
		</section>
	);
}
