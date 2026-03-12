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

export function ProductFaqSection({
	title,
	items,
}: {
	title: string;
	items: Array<{ question: string; answer: string }>;
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

					<section itemScope itemType="https://schema.org/FAQPage" className="max-w-3xl mx-auto">
						<Accordion type="single" collapsible defaultValue="item-0">
							{items.map((item, index) => (
								<AccordionItem
									key={index}
									value={`item-${index}`}
									itemScope
									itemProp="mainEntity"
									itemType="https://schema.org/Question"
								>
									<AccordionTrigger>
										<span itemProp="name">{item.question}</span>
									</AccordionTrigger>
									<AccordionContent
										forceMount
										itemScope
										itemProp="acceptedAnswer"
										itemType="https://schema.org/Answer"
									>
										<p itemProp="text" className="text-left">
											{item.answer}
										</p>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</section>
				</div>
			</Container>
		</div>
	);
}
