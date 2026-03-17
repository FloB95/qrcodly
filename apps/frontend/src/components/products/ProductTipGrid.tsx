'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import {
	LightBulbIcon,
	CheckBadgeIcon,
	SparklesIcon,
	RocketLaunchIcon,
} from '@heroicons/react/24/outline';

const TIP_ICONS = [LightBulbIcon, CheckBadgeIcon, SparklesIcon, RocketLaunchIcon];

export function ProductTipGrid({
	title,
	tips,
}: {
	title: string;
	tips: Array<{ title: string; description: string }>;
}) {
	return (
		<div className="py-16 sm:py-24 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
			<div className="absolute top-0 right-0 w-[500px] h-[300px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

			<Container>
				<div className="sm:px-6 lg:px-8 relative">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
						<Heading as="h2" size="section" className="mb-4 text-white">
							{title}
						</Heading>
					</AnimateOnScroll>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto">
						{tips.map((tip, i) => {
							const Icon = TIP_ICONS[i % TIP_ICONS.length]!;
							return (
								<AnimateOnScroll key={tip.title} delay={i * 0.08}>
									<div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-6 sm:p-8 h-full transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15]">
										<div className="w-11 h-11 rounded-xl bg-white/[0.08] flex items-center justify-center text-teal-400 mb-5">
											<Icon className="h-5 w-5" />
										</div>
										<h3 className="text-lg font-semibold text-white mb-2">{tip.title}</h3>
										<p className="text-slate-300 text-base leading-relaxed">{tip.description}</p>
									</div>
								</AnimateOnScroll>
							);
						})}
					</div>
				</div>
			</Container>
		</div>
	);
}
