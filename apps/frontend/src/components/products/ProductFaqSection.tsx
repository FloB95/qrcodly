'use client';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { SectionHead, cardClass } from '@/components/marketing/SectionHead';
import { Link } from '@/i18n/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export function ProductFaqSection({
	eyebrow,
	title,
	items,
	viewAllLabel,
}: {
	eyebrow?: string;
	title: string;
	items: Array<{ question: string; answer: string }>;
	viewAllLabel?: string;
}) {
	return (
		<section className="py-16 sm:py-24">
			<Container>
				<div className="grid grid-cols-1 gap-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-14 lg:px-8">
					<div className="flex flex-col">
						<SectionHead eyebrow={eyebrow} title={title} className="mb-0 sm:mb-0" />
						{viewAllLabel && (
							<Link
								href="/faq"
								className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900"
							>
								{viewAllLabel}
								<ArrowRightIcon className="size-4" />
							</Link>
						)}
					</div>
					<AnimateOnScroll className={cn(cardClass, 'px-5 py-2 sm:px-8')}>
						<Accordion type="single" collapsible defaultValue="item-0">
							{items.map((item, index) => (
								<AccordionItem
									key={item.question}
									value={`item-${index}`}
									className="last:border-b-0"
								>
									<AccordionTrigger>
										<span className="text-left">{item.question}</span>
									</AccordionTrigger>
									<AccordionContent>
										<p className="text-left text-slate-600">{item.answer}</p>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</AnimateOnScroll>
				</div>
			</Container>
		</section>
	);
}
