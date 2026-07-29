import type { MockupTone } from '@/components/products/mockups/UseCaseMockups';

export type UseCaseIconName =
	| 'BuildingStorefrontIcon'
	| 'ShoppingBagIcon'
	| 'TicketIcon'
	| 'HomeModernIcon'
	| 'AcademicCapIcon'
	| 'MegaphoneIcon'
	| 'ChatBubbleBottomCenterTextIcon'
	| 'CurrencyDollarIcon'
	| 'ShoppingCartIcon'
	| 'CodeBracketIcon'
	| 'BuildingOffice2Icon';

/** Which product mockup illustrates a feature. Copy comes from the `visuals.vN` dictionary keys. */
export type VisualKind =
	| 'scanDestination'
	| 'dynamicSwap'
	| 'insights'
	| 'placement'
	| 'brandedLink'
	| 'apiSnippet'
	| 'linkList';

export type VisualSpec = {
	kind: VisualKind;
	tone: MockupTone;
};

export type UseCaseDef = {
	slug: string;
	namespace: string;
	iconName: UseCaseIconName;
	parentPath: string;
	/** One entry per feature section; length defines how many features the page renders. */
	visuals: VisualSpec[];
};

export const QR_CODE_USE_CASES: UseCaseDef[] = [
	{
		slug: 'restaurants',
		namespace: 'qrCodesRestaurants',
		iconName: 'BuildingStorefrontIcon',
		parentPath: '/products/qr-codes',
		visuals: [
			{ kind: 'scanDestination', tone: 'amber' },
			{ kind: 'placement', tone: 'violet' },
		],
	},
	{
		slug: 'retail',
		namespace: 'qrCodesRetail',
		iconName: 'ShoppingBagIcon',
		parentPath: '/products/qr-codes',
		visuals: [
			{ kind: 'scanDestination', tone: 'violet' },
			{ kind: 'dynamicSwap', tone: 'emerald' },
		],
	},
	{
		slug: 'events',
		namespace: 'qrCodesEvents',
		iconName: 'TicketIcon',
		parentPath: '/products/qr-codes',
		visuals: [
			{ kind: 'placement', tone: 'sky' },
			{ kind: 'dynamicSwap', tone: 'emerald' },
		],
	},
	{
		slug: 'real-estate',
		namespace: 'qrCodesRealEstate',
		iconName: 'HomeModernIcon',
		parentPath: '/products/qr-codes',
		visuals: [
			{ kind: 'placement', tone: 'amber' },
			{ kind: 'scanDestination', tone: 'violet' },
		],
	},
	{
		slug: 'education',
		namespace: 'qrCodesEducation',
		iconName: 'AcademicCapIcon',
		parentPath: '/products/qr-codes',
		visuals: [
			{ kind: 'scanDestination', tone: 'indigo' },
			{ kind: 'dynamicSwap', tone: 'emerald' },
		],
	},
	{
		slug: 'marketing',
		namespace: 'qrCodesMarketing',
		iconName: 'MegaphoneIcon',
		parentPath: '/products/qr-codes',
		visuals: [
			{ kind: 'placement', tone: 'amber' },
			{ kind: 'insights', tone: 'indigo' },
		],
	},
];

export const URL_SHORTENER_USE_CASES: UseCaseDef[] = [
	{
		slug: 'marketing-teams',
		namespace: 'urlShortenerMarketingTeams',
		iconName: 'MegaphoneIcon',
		parentPath: '/products/url-shortener',
		visuals: [
			{ kind: 'brandedLink', tone: 'teal' },
			{ kind: 'insights', tone: 'indigo' },
		],
	},
	{
		slug: 'social-media',
		namespace: 'urlShortenerSocialMedia',
		iconName: 'ChatBubbleBottomCenterTextIcon',
		parentPath: '/products/url-shortener',
		visuals: [
			{ kind: 'brandedLink', tone: 'teal' },
			{ kind: 'insights', tone: 'sky' },
			{ kind: 'dynamicSwap', tone: 'emerald' },
		],
	},
	{
		slug: 'sales',
		namespace: 'urlShortenerSales',
		iconName: 'CurrencyDollarIcon',
		parentPath: '/products/url-shortener',
		visuals: [
			{ kind: 'linkList', tone: 'teal' },
			{ kind: 'brandedLink', tone: 'sky' },
			{ kind: 'insights', tone: 'indigo' },
		],
	},
	{
		slug: 'e-commerce',
		namespace: 'urlShortenerEcommerce',
		iconName: 'ShoppingCartIcon',
		parentPath: '/products/url-shortener',
		visuals: [
			{ kind: 'linkList', tone: 'teal' },
			{ kind: 'insights', tone: 'indigo' },
		],
	},
	{
		slug: 'developers',
		namespace: 'urlShortenerDevelopers',
		iconName: 'CodeBracketIcon',
		parentPath: '/products/url-shortener',
		visuals: [
			{ kind: 'apiSnippet', tone: 'sky' },
			{ kind: 'apiSnippet', tone: 'indigo' },
			{ kind: 'brandedLink', tone: 'teal' },
		],
	},
	{
		slug: 'agencies',
		namespace: 'urlShortenerAgencies',
		iconName: 'BuildingOffice2Icon',
		parentPath: '/products/url-shortener',
		visuals: [
			{ kind: 'brandedLink', tone: 'teal' },
			{ kind: 'insights', tone: 'indigo' },
			{ kind: 'linkList', tone: 'emerald' },
		],
	},
];

export const ALL_USE_CASES = [...QR_CODE_USE_CASES, ...URL_SHORTENER_USE_CASES];

export function getUseCaseBySlug(slug: string, collection: UseCaseDef[]): UseCaseDef | undefined {
	return collection.find((uc) => uc.slug === slug);
}

export function getSiblingUseCases(currentSlug: string, collection: UseCaseDef[]): UseCaseDef[] {
	return collection.filter((uc) => uc.slug !== currentSlug);
}
