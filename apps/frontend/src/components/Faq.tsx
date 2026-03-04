import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';
import Container from './ui/container';

export default function FAQSection() {
	const t = useTranslations('faq');

	const faqItems = Array.from({ length: 11 }).map((_, index) => ({
		questionKey: `question${index + 1}`,
		answerKey: `answer${index + 1}`,
	}));
	return (
		<section itemScope itemType="https://schema.org/FAQPage" className="mx-auto text-center">
			<Container>
				<div className="px-4 sm:px-6">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 mb-6 lg:mb-10">
						{t('headline')}
					</h2>
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
									forceMount
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
				</div>
			</Container>
		</section>
	);
}
