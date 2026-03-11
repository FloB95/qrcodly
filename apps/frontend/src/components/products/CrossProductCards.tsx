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
						<Heading as="h2" size="section" className="">
							{title}
						</Heading>
					</AnimateOnScroll>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{cards.map((card, i) => (
							<AnimateOnScroll key={card.href} delay={i * 0.1}>
								<Link
									href={card.href}
									className="group block bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6 sm:p-8 hover:shadow-2xl transition-shadow"
								>
									<div className="flex items-start gap-4">
										<div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
											{card.icon}
										</div>
										<div className="flex-1">
											<h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
												{card.title}
												<ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
											</h3>
											<p className="text-slate-600 text-sm sm:text-base leading-relaxed">
												{card.description}
											</p>
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
