'use client';

import { useState, useEffect } from 'react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';

export interface FaqItem {
	id: string;
	question: string;
	answer: string;
}

export function FaqCategorySection({
	title,
	items,
	openItemId,
	delay = 0,
}: {
	title: string;
	items: FaqItem[];
	openItemId?: string;
	delay?: number;
}) {
	const [value, setValue] = useState<string | undefined>(openItemId);

	useEffect(() => {
		if (openItemId) setValue(openItemId);
	}, [openItemId]);

	return (
		<AnimateOnScroll delay={delay}>
			<div className="rounded-2xl bg-card p-6 sm:p-8">
				<h3 className="text-xs font-semibold tracking-widest uppercase text-foreground pb-4 border-b border-border">
					{title}
				</h3>
				<Accordion type="single" collapsible value={value} onValueChange={setValue}>
					{items.map((item) => (
						<AccordionItem key={item.id} value={item.id} id={item.id}>
							<AccordionTrigger>
								<span>{item.question}</span>
							</AccordionTrigger>
							<AccordionContent>
								<p className="text-left text-muted-foreground leading-relaxed">{item.answer}</p>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</AnimateOnScroll>
	);
}
