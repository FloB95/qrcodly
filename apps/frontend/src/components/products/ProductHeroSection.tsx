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
	secondaryCtaLabel,
	secondaryCtaHref,
	children,
}: {
	title: string;
	subtitle: string;
	ctaLabel?: string;
	ctaHref?: string;
	secondaryCtaLabel?: string;
	secondaryCtaHref?: string;
	children?: React.ReactNode;
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
					{children ??
						(ctaLabel && ctaHref ? (
							<div className="flex flex-wrap items-center justify-center gap-3">
								<Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
									{ctaLabel}
								</Link>
								{secondaryCtaLabel && secondaryCtaHref && (
									<Link
										href={secondaryCtaHref}
										className={buttonVariants({ size: 'lg', variant: 'outline' })}
									>
										{secondaryCtaLabel}
									</Link>
								)}
							</div>
						) : null)}
				</AnimateOnLoad>
			</div>
		</Container>
	);
}
