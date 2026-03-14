import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Heading } from '@/components/ui/heading';
import { useTranslations } from 'next-intl';
import Container from './ui/container';
import { Link } from '@/i18n/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

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
					<Heading as="h2" size="lg" className="mb-6 lg:mb-10">
						{t('headline')}
					</Heading>
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
								<AccordionContent>
									<div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
										<p itemProp="text" className="text-left">
											{t(item.answerKey)}
										</p>
									</div>
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
					<div className="mt-8">
						<Link
							href="/faq"
							className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
						>
							{t('viewAll')}
							<ArrowRightIcon className="h-4 w-4" />
						</Link>
					</div>
				</div>
			</Container>
		</section>
	);
}
