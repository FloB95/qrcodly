import type { Testimonial } from '@/components/products/ProductTestimonial';

/**
 * Customer quotes stay in the language they were given in — attributing translated
 * words to a named person would put statements in their mouth they never made.
 * Only the surrounding section labels are localised.
 */
export const INHOTEL_TESTIMONIAL: Testimonial = {
	quoteLead:
		"I've tried several QR tools, and QRcodly is one that truly feels built with care. Their free version is genuinely usable, without hidden limitations.",
	quoteRest:
		'Beyond QR codes, the built-in URL shortener with custom domain support makes it far more powerful than most alternatives. The interface is clean and does exactly what you need, without friction. What really stands out is the engineering quality, from open source code to API and MCP server support. This is especially exciting for AI-native platforms like inHotel, enabling users to simply say, "Create a QR code for https://example.com using my \'Corporate\' template," and have it done instantly.',
	authorName: 'Jan Popovic',
	authorRole: 'Co-Founder @ inHotel',
	companyLogo: {
		src: '/images/logos/inhotel.svg',
		alt: 'inHotel',
		width: 2048,
		height: 985,
	},
	companyUrl: 'https://www.inhotel.io/',
};
