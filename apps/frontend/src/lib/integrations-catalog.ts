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
};

export type ComingSoonIntegrationEntry = BaseIntegrationEntry & {
	kind: 'coming-soon';
};

export type IntegrationCatalogEntry =
	| AnalyticsIntegrationEntry
	| ExternalLinkIntegrationEntry
	| ComingSoonIntegrationEntry;

// Chrome Web Store listing — replace `TODO_EXTENSION_ID` with the real ID
// once the extension has been published and Google assigned its store ID.
const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/qrcodly/TODO_EXTENSION_ID';

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
		kind: 'external-link',
		href: CHROME_EXTENSION_URL,
		ctaKey: 'installCta',
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
		kind: 'coming-soon',
		tags: ['design'],
		nameKey: 'adobeIndesign.name',
		descriptionKey: 'adobeIndesign.description',
	},
];
