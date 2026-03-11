'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnLoad } from '@/components/features/AnimateOnScroll';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export function ProductHeroSection({
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
		<Container>
			<div className="pt-16 sm:pt-20 pb-16 sm:pb-24 text-center sm:px-6 lg:px-8">
				<AnimateOnLoad className="mt-14">
					<Heading as="h1" size="hero" className="mb-6 max-w-4xl mx-auto">
						{title}
					</Heading>
				</AnimateOnLoad>
				<AnimateOnLoad delay={0.2}>
					<p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-700 mb-8">{subtitle}</p>
					<Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
						{ctaLabel}
					</Link>
				</AnimateOnLoad>
			</div>
		</Container>
	);
}
