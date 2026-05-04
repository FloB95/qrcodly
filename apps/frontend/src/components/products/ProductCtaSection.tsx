'use client';

import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Link } from '@/i18n/navigation';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';

export function ProductCtaSection({
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
		<div className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="max-w-5xl mx-auto p-px rounded-2xl bg-gradient-to-r from-[#f4f4f5] to-[#fddfbc] dark:from-border dark:to-border">
						<div className="flex flex-col items-center justify-center text-center py-12 px-5 xs:px-10 md:py-16 rounded-[15px] bg-gradient-to-r from-white to-[#fff3e6] dark:bg-none dark:bg-card">
							<Heading as="h2" size="lg" className="">
								{title}
							</Heading>
							<p className="text-muted-foreground mt-3 md:text-lg max-w-xl">{subtitle}</p>
							<div className="mt-8">
								<Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
									{ctaLabel}
								</Link>
							</div>
						</div>
					</AnimateOnScroll>
				</div>
			</Container>
		</div>
	);
}
