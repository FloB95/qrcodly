export function HowToJsonLd({
	name,
	steps,
}: {
	name: string;
	steps: Array<{ name: string; text: string }>;
}) {
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'HowTo',
		name,
		step: steps.map((s, i) => ({
			'@type': 'HowToStep',
			position: i + 1,
			name: s.name,
			text: s.text,
		})),
	}).replaceAll('<', '\\u003c');

	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />;
}
