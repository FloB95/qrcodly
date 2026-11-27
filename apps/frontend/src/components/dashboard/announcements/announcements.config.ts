import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/** How many of the newest announcements the "what's new" list shows. */
export const LISTED_ANNOUNCEMENTS = 3;

/** Days after release the "new" badge on a feature itself may show, until the user opens it. */
export const BADGE_DAYS = 7;

export type AnnouncementContext = {
	hasProPlan: boolean;
	hasCustomDomain: boolean;
};

export type Announcement = {
	id: string;
	/** Release day (YYYY-MM-DD). Accounts created later never knew it any other way. */
	date: string;
	/** Key under `announcements.items` in the dictionaries. */
	i18nKey: string;
	/** Animated look at the feature, on top of its dialog. */
	preview: ComponentType;
	/** Whether the account can use it now; if not, the dialog names what it takes (`requirement`). */
	isAvailable: (ctx: AnnouncementContext) => boolean;
	/** The main button: where it leads, by what the account can use. `label` is a key under `cta`. */
	cta: (ctx: AnnouncementContext) => { href: string; label: string };
	/** Where the FAQ answers questions about it, if it does. */
	faqHref?: string;
};

/** Newest first. */
export const announcements: Announcement[] = [
	{
		id: 'short-url-alias',
		date: '2026-11-27',
		i18nKey: 'shortUrlAlias',
		preview: dynamic(() =>
			import('./previews/ShortUrlAliasPreview').then((mod) => mod.ShortUrlAliasPreview),
		),
		isAvailable: ({ hasCustomDomain }) => hasCustomDomain,
		cta: ({ hasProPlan, hasCustomDomain }) => {
			if (hasCustomDomain) return { href: '/dashboard/short-urls', label: 'shortUrls' };
			if (hasProPlan) return { href: '/dashboard/settings/domains', label: 'domains' };
			return { href: '/plans', label: 'plans' };
		},
		faqHref: '/faq',
	},
	{
		id: 'scan-ip-exclusions',
		date: '2026-11-23',
		i18nKey: 'scanIpExclusions',
		preview: dynamic(() =>
			import('./previews/ScanIpExclusionsPreview').then((mod) => mod.ScanIpExclusionsPreview),
		),
		isAvailable: ({ hasProPlan }) => hasProPlan,
		cta: ({ hasProPlan }) =>
			hasProPlan
				? { href: '/dashboard/settings/analytics', label: 'settings' }
				: { href: '/plans', label: 'plans' },
	},
];
