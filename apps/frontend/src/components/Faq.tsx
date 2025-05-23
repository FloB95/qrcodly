import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';

export default function FAQSection() {
	const t = useTranslations('faq');

	const faqItems = Array.from({ length: 10 }).map((_, index) => ({
		questionKey: `question${index + 1}`,
		answerKey: `answer${index + 1}`,
	}));
	return (
		<section
			itemScope
			itemType="https://schema.org/FAQPage"
			className="mx-auto mt-24 mb-10 text-center sm:mt-50 sm:mb-28"
		>
			<h2 className="mb-8 text-4xl font-bold text-center">{t('headline')}</h2>
			<Accordion type="single" collapsible defaultValue="item-1">
				{faqItems.map((item, index) => (
					<AccordionItem
						key={index}
						value={`item-${index + 1}`}
						itemScope
						itemProp="mainEntity"
						itemType="https://schema.org/Question"
					>
						<AccordionTrigger>
							<span itemProp="name">{t(item.questionKey)}</span>
						</AccordionTrigger>
						<AccordionContent
							itemScope
							itemProp="acceptedAnswer"
							itemType="https://schema.org/Answer"
						>
							<p itemProp="text" className="text-left">
								{t(item.answerKey)}
							</p>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</section>
	);
}
