'use client';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { Link } from '@/i18n/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export function ProductFaqSection({
	title,
	items,
	viewAllLabel,
}: {
	title: string;
	items: Array<{ question: string; answer: string }>;
	viewAllLabel?: string;
}) {
	return (
		<div className="py-16 sm:py-24">
			<Container>
				<div className="px-4 sm:px-6">
					<AnimateOnScroll className="text-center mb-8 sm:mb-12">
						<Heading as="h2" size="lg" className="">
							{title}
						</Heading>
					</AnimateOnScroll>

					<section className="max-w-3xl mx-auto">
						<Accordion type="single" collapsible defaultValue="item-0">
							{items.map((item, index) => (
								<AccordionItem key={index} value={`item-${index}`}>
									<AccordionTrigger>{item.question}</AccordionTrigger>
									<AccordionContent>
										<p className="text-left">{item.answer}</p>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>

						{viewAllLabel && (
							<div className="mt-8 text-center">
								<Link
									href="/faq"
									className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
								>
									{viewAllLabel}
									<ArrowRightIcon className="h-4 w-4" />
								</Link>
							</div>
						)}
					</section>
				</div>
			</Container>
		</div>
	);
}
