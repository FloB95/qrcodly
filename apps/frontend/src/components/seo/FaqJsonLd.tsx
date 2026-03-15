export function FaqJsonLd({ items }: { items: Array<{ question: string; answer: string }> }) {
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer,
			},
		})),
	}).replaceAll('<', '\\u003c');

	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />;
}
