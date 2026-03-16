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

export type UseCaseDef = {
	slug: string;
	namespace: string;
	iconName: UseCaseIconName;
	parentPath: string;
	featureImages: [string, string, string];
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
			`${IMG}/analytics-dashboard.jpg`,
		],
	},
	{
		slug: 'retail',
		namespace: 'qrCodesRetail',
		iconName: 'ShoppingBagIcon',
		parentPath: '/products/qr-codes',
		featureImages: [
			`${IMG}/qr-retail-packaging.jpg`,
			`${IMG}/qr-retail-promo.jpg`,
			`${IMG}/analytics-dashboard.jpg`,
		],
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
			`${IMG}/analytics-dashboard.jpg`,
		],
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
	},
	{
		slug: 'sales',
		namespace: 'urlShortenerSales',
		iconName: 'CurrencyDollarIcon',
		parentPath: '/products/url-shortener',
		featureImages: [
			`${IMG}/url-sales-outreach.jpg`,
			`${IMG}/url-sales-branded.jpg`,
			`${IMG}/analytics-dashboard.jpg`,
		],
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
	},
	{
		slug: 'agencies',
		namespace: 'urlShortenerAgencies',
		iconName: 'BuildingOffice2Icon',
		parentPath: '/products/url-shortener',
		featureImages: [
			`${IMG}/url-agency-domains.jpg`,
			`${IMG}/analytics-dashboard.jpg`,
			`${IMG}/url-agency-workspace.jpg`,
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
