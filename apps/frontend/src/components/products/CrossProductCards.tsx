'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { Link } from '@/i18n/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export function CrossProductCards({
	title,
	cards,
}: {
	title: string;
	cards: Array<{ title: string; description: string; href: string; icon: ReactNode }>;
}) {
	return (
		<div className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14">
						<Heading as="h2" size="section">
							{title}
						</Heading>
					</AnimateOnScroll>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto">
						{cards.map((card, i) => (
							<AnimateOnScroll key={card.href} delay={i * 0.1}>
								<Link
									href={card.href}
									className="group block bg-white rounded-[20px] sm:rounded-[28px] p-7 sm:p-8 hover:-translate-y-0.5 transition-all duration-300"
								>
									<div className="flex items-start gap-4">
										<div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 transition-colors duration-300 group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:via-slate-800 group-hover:to-slate-900 group-hover:text-white">
											{card.icon}
										</div>
										<div className="flex-1">
											<h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
												{card.title}
												<ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
											</h3>
											<p className="text-slate-500 text-sm leading-relaxed">{card.description}</p>
										</div>
									</div>
								</Link>
							</AnimateOnScroll>
						))}
					</div>
				</div>
			</Container>
		</div>
	);
}
