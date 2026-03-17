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

export type LayoutTemplate = 'hands-on' | 'data-driven' | 'technical';

export type UseCaseDef = {
	slug: string;
	namespace: string;
	iconName: UseCaseIconName;
	parentPath: string;
	featureImages: [string, string, string];
	layoutTemplate: LayoutTemplate;
	featureCount: 2 | 3;
	hasStats: boolean;
	hasTips: boolean;
};

const IMG = '/images/use-cases';

export const QR_CODE_USE_CASES: UseCaseDef[] = [
	{
		slug: 'restaurants',
		namespace: 'qrCodesRestaurants',
		iconName: 'BuildingStorefrontIcon',
		parentPath: '/products/qr-codes',
		featureImages: [
			`${IMG}/qr-restaurant-menu.jpg`,
			`${IMG}/qr-restaurant-wifi.jpg`,
			`${IMG}/analytics-dashboard.png`,
		],
		layoutTemplate: 'hands-on',
		featureCount: 2,
		hasStats: true,
		hasTips: true,
	},
	{
		slug: 'retail',
		namespace: 'qrCodesRetail',
		iconName: 'ShoppingBagIcon',
		parentPath: '/products/qr-codes',
		featureImages: [
			`${IMG}/qr-retail-packaging.jpg`,
			`${IMG}/qr-retail-promo.jpg`,
			`${IMG}/analytics-dashboard.png`,
		],
		layoutTemplate: 'data-driven',
		featureCount: 2,
		hasStats: true,
		hasTips: true,
	},
	{
		slug: 'events',
		namespace: 'qrCodesEvents',
		iconName: 'TicketIcon',
		parentPath: '/products/qr-codes',
		featureImages: [
			`${IMG}/qr-events-checkin.jpg`,
			`${IMG}/qr-events-schedule.jpg`,
			`${IMG}/qr-events-networking.jpg`,
		],
		layoutTemplate: 'hands-on',
		featureCount: 2,
		hasStats: true,
		hasTips: true,
	},
	{
		slug: 'real-estate',
		namespace: 'qrCodesRealEstate',
		iconName: 'HomeModernIcon',
		parentPath: '/products/qr-codes',
		featureImages: [
			`${IMG}/qr-realestate-sign.jpg`,
			`${IMG}/qr-realestate-tour.jpg`,
			`${IMG}/qr-realestate-tracking.jpg`,
		],
		layoutTemplate: 'hands-on',
		featureCount: 2,
		hasStats: true,
		hasTips: true,
	},
	{
		slug: 'education',
		namespace: 'qrCodesEducation',
		iconName: 'AcademicCapIcon',
		parentPath: '/products/qr-codes',
		featureImages: [
			`${IMG}/qr-education-classroom.jpg`,
			`${IMG}/qr-education-assignment.jpg`,
			`${IMG}/qr-education-engagement.jpg`,
		],
		layoutTemplate: 'hands-on',
		featureCount: 2,
		hasStats: true,
		hasTips: true,
	},
	{
		slug: 'marketing',
		namespace: 'qrCodesMarketing',
		iconName: 'MegaphoneIcon',
		parentPath: '/products/qr-codes',
		featureImages: [
			`${IMG}/qr-marketing-print.jpg`,
			`${IMG}/qr-marketing-abtest.jpg`,
			`${IMG}/qr-marketing-branding.jpg`,
		],
		layoutTemplate: 'data-driven',
		featureCount: 2,
		hasStats: true,
		hasTips: true,
	},
];

export const URL_SHORTENER_USE_CASES: UseCaseDef[] = [
	{
		slug: 'marketing-teams',
		namespace: 'urlShortenerMarketingTeams',
		iconName: 'MegaphoneIcon',
		parentPath: '/products/url-shortener',
		featureImages: [
			`${IMG}/url-marketing-campaign.jpg`,
			`${IMG}/url-marketing-branded.jpg`,
			`${IMG}/analytics-dashboard.png`,
		],
		layoutTemplate: 'data-driven',
		featureCount: 2,
		hasStats: true,
		hasTips: true,
	},
	{
		slug: 'social-media',
		namespace: 'urlShortenerSocialMedia',
		iconName: 'ChatBubbleBottomCenterTextIcon',
		parentPath: '/products/url-shortener',
		featureImages: [
			`${IMG}/url-social-posts.jpg`,
			`${IMG}/url-social-tracking.jpg`,
			`${IMG}/url-social-dynamic.jpg`,
		],
		layoutTemplate: 'technical',
		featureCount: 3,
		hasStats: false,
		hasTips: false,
	},
	{
		slug: 'sales',
		namespace: 'urlShortenerSales',
		iconName: 'CurrencyDollarIcon',
		parentPath: '/products/url-shortener',
		featureImages: [
			`${IMG}/url-sales-outreach.jpg`,
			`${IMG}/url-sales-branded.jpg`,
			`${IMG}/analytics-dashboard.png`,
		],
		layoutTemplate: 'technical',
		featureCount: 3,
		hasStats: false,
		hasTips: false,
	},
	{
		slug: 'e-commerce',
		namespace: 'urlShortenerEcommerce',
		iconName: 'ShoppingCartIcon',
		parentPath: '/products/url-shortener',
		featureImages: [
			`${IMG}/url-ecommerce-products.jpg`,
			`${IMG}/url-ecommerce-channels.jpg`,
			`${IMG}/url-ecommerce-seasonal.jpg`,
		],
		layoutTemplate: 'data-driven',
		featureCount: 2,
		hasStats: true,
		hasTips: true,
	},
	{
		slug: 'developers',
		namespace: 'urlShortenerDevelopers',
		iconName: 'CodeBracketIcon',
		parentPath: '/products/url-shortener',
		featureImages: [
			`${IMG}/url-dev-api.jpg`,
			`${IMG}/url-dev-auth.jpg`,
			`${IMG}/url-dev-integration.jpg`,
		],
		layoutTemplate: 'technical',
		featureCount: 3,
		hasStats: false,
		hasTips: false,
	},
	{
		slug: 'agencies',
		namespace: 'urlShortenerAgencies',
		iconName: 'BuildingOffice2Icon',
		parentPath: '/products/url-shortener',
		featureImages: [
			`${IMG}/url-agency-domains.jpg`,
			`${IMG}/analytics-dashboard.png`,
			`${IMG}/url-agency-workspace.jpg`,
		],
		layoutTemplate: 'technical',
		featureCount: 3,
		hasStats: false,
		hasTips: false,
	},
];

export const ALL_USE_CASES = [...QR_CODE_USE_CASES, ...URL_SHORTENER_USE_CASES];

export function getUseCaseBySlug(slug: string, collection: UseCaseDef[]): UseCaseDef | undefined {
	return collection.find((uc) => uc.slug === slug);
}

export function getSiblingUseCases(currentSlug: string, collection: UseCaseDef[]): UseCaseDef[] {
	return collection.filter((uc) => uc.slug !== currentSlug);
}
