'use client';

import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { SectionHead } from '@/components/marketing/SectionHead';
import {
	LightBulbIcon,
	CheckBadgeIcon,
	SparklesIcon,
	RocketLaunchIcon,
} from '@heroicons/react/24/outline';

const TIP_ICONS = [LightBulbIcon, CheckBadgeIcon, SparklesIcon, RocketLaunchIcon];

export function ProductTipGrid({
	eyebrow,
	title,
	tips,
}: {
	eyebrow?: string;
	title: string;
	tips: Array<{ title: string; description: string }>;
}) {
	return (
		<section className="-mx-4 my-8 bg-slate-900 py-16 text-white sm:mx-0 sm:my-12 sm:py-24">
			<Container>
				<div className="px-4 sm:px-6 lg:px-8">
					<SectionHead eyebrow={eyebrow} title={title} dark />
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{tips.map((tip, i) => {
							const Icon = TIP_ICONS[i % TIP_ICONS.length]!;
							return (
								<AnimateOnScroll key={tip.title} delay={i * 0.06}>
									<div className="flex h-full flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-6">
										<Icon className="size-5 text-amber-300" aria-hidden="true" />
										<h3 className="text-lg font-bold tracking-tight">{tip.title}</h3>
										<p className="text-[15px] leading-relaxed text-slate-300">{tip.description}</p>
									</div>
								</AnimateOnScroll>
							);
						})}
					</div>
				</div>
			</Container>
		</section>
	);
}
