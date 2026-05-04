'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export function ProductFeatureSection({
	title,
	description,
	bullets,
	visual,
	reversed,
	comingSoon,
	actionButton,
}: {
	title: string;
	description: string;
	bullets: string[];
	visual: ReactNode;
	reversed?: boolean;
	comingSoon?: string;
	actionButton?: { label: string; href: string; external?: boolean };
}) {
	return (
		<div className="py-12 sm:py-20">
			<Container>
				<div
					className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-10 sm:gap-12 lg:gap-16 sm:px-6 lg:px-8`}
				>
					<AnimateOnScroll
						className="flex-1 max-w-xl"
						variant={reversed ? 'slideRight' : 'slideLeft'}
						delay={0.1}
					>
						{comingSoon && (
							<Badge variant="blue" className="mb-3">
								{comingSoon}
							</Badge>
						)}
						<Heading as="h2" size="md" className="mb-4">
							{title}
						</Heading>
						<p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-6">
							{description}
						</p>
						<ul className="space-y-3">
							{bullets.map((bullet) => (
								<li key={bullet} className="flex items-start gap-3">
									<CheckIcon className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
									<span className="text-muted-foreground text-sm sm:text-base">{bullet}</span>
								</li>
							))}
						</ul>
						{actionButton && (
							<a
								href={actionButton.href}
								target={actionButton.external ? '_blank' : undefined}
								rel={actionButton.external ? 'noopener noreferrer' : undefined}
								className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors group"
							>
								{actionButton.label}
								<ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
							</a>
						)}
					</AnimateOnScroll>

					<AnimateOnScroll
						className="flex-1 w-full max-w-lg lg:max-w-none"
						variant={reversed ? 'slideLeft' : 'slideRight'}
						delay={0.2}
					>
						{visual}
					</AnimateOnScroll>
				</div>
			</Container>
		</div>
	);
}
