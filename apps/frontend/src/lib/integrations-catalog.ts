import type { TProviderType } from '@shared/schemas';

export type IntegrationKind = 'analytics' | 'external-link' | 'coming-soon';

export type IntegrationTag = 'analytics' | 'browser' | 'ai' | 'design';

type BaseIntegrationEntry = {
	id: string;
	slug: string;
	nameKey: string;
	descriptionKey: string;
	tags: IntegrationTag[];
};

export type AnalyticsIntegrationEntry = BaseIntegrationEntry & {
	kind: 'analytics';
	providerType: TProviderType;
};

export type ExternalLinkIntegrationEntry = BaseIntegrationEntry & {
	kind: 'external-link';
	href: string;
	ctaKey: string;
	requiresApiKey?: boolean;
};

export type ComingSoonIntegrationEntry = BaseIntegrationEntry & {
	kind: 'coming-soon';
};

export type IntegrationCatalogEntry =
	| AnalyticsIntegrationEntry
	| ExternalLinkIntegrationEntry
	| ComingSoonIntegrationEntry;

export const INTEGRATIONS_CATALOG: IntegrationCatalogEntry[] = [
	{
		id: 'google-analytics',
		slug: 'google-analytics',
		kind: 'analytics',
		providerType: 'google_analytics',
		tags: ['analytics'],
		nameKey: 'googleAnalytics.name',
		descriptionKey: 'googleAnalytics.description',
	},
	{
		id: 'matomo',
		slug: 'matomo',
		kind: 'analytics',
		providerType: 'matomo',
		tags: ['analytics'],
		nameKey: 'matomo.name',
		descriptionKey: 'matomo.description',
	},
	{
		id: 'browser-extension-chrome',
		slug: 'browser-extension-chrome',
		kind: 'coming-soon',
		tags: ['browser'],
		nameKey: 'browserExtensionChrome.name',
		descriptionKey: 'browserExtensionChrome.description',
	},
	{
		id: 'chatgpt',
		slug: 'chatgpt',
		kind: 'coming-soon',
		tags: ['ai'],
		nameKey: 'chatgpt.name',
		descriptionKey: 'chatgpt.description',
	},
	{
		id: 'adobe-indesign',
		slug: 'adobe-indesign',
		kind: 'external-link',
		tags: ['design'],
		nameKey: 'adobeIndesign.name',
		descriptionKey: 'adobeIndesign.description',
		href: 'https://exchange.adobe.com/apps/cc/7b62450e',
		ctaKey: 'adobeIndesign.cta',
		requiresApiKey: true,
	},
];
