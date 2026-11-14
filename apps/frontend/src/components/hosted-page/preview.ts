import {
	getStylePresetTheme,
	getTemplateTheme,
	HOSTED_PAGE_TEMPLATES,
	type THostedPageTemplateId,
	type THostedPageTheme,
} from '@shared/schemas';

export type PreviewOptions = {
	hasProPlan: boolean;
	shortCode?: string;
	/** Public URLs by storage key, for images uploaded or loaded in this session */
	assetUrls?: Record<string, string>;
};

/** Translates keys below `generator.contentSwitch.hosted.templates`. */
export type TemplateTranslator = (key: string) => string;

export function resolvePreviewTheme(
	settings: { theme?: THostedPageTheme } | undefined,
	hasProPlan: boolean,
): THostedPageTheme {
	// without Pro the page falls back to the editorial preset, never to an unstyled page
	return hasProPlan && settings?.theme ? settings.theme : getStylePresetTheme('editorial');
}

type TemplateImageSlot = 'coverKey' | 'logoKey';
const TEMPLATE_IMAGE_KEY = /^template:([A-Za-z]+):(coverKey|logoKey)$/;

/**
 * An adopted template's image stays a shipped file until the page is saved, so trying templates
 * never uploads anything; saving uploads the images the page still uses.
 */
export const templateImageKey = (id: THostedPageTemplateId, slot: TemplateImageSlot) =>
	`template:${id}:${slot}`;

export function parseTemplateImageKey(
	key: string | undefined,
): { id: THostedPageTemplateId; slot: TemplateImageSlot } | null {
	const match = key ? TEMPLATE_IMAGE_KEY.exec(key) : null;
	if (!match || !HOSTED_PAGE_TEMPLATES.some((template) => template.id === match[1])) return null;
	return { id: match[1] as THostedPageTemplateId, slot: match[2] as TemplateImageSlot };
}

export const templateImageUrl = (id: THostedPageTemplateId, slot: TemplateImageSlot) =>
	slot === 'coverKey' ? `/hosted-templates/${id}-cover.webp` : `/hosted-templates/${id}-logo.png`;

export const SAMPLE_COVER_KEY = 'sample:cover';
export const SAMPLE_LOGO_KEY = 'sample:logo';

/** Static demo images shipped with the app, one pair per template. */
export function hostedTemplateAssetUrls(id: THostedPageTemplateId): Record<string, string> {
	return {
		[SAMPLE_COVER_KEY]: templateImageUrl(id, 'coverKey'),
		[SAMPLE_LOGO_KEY]: templateImageUrl(id, 'logoKey'),
	};
}

/** A template picked in the editor, or the blank sheet. */
export type HostedTemplateChoice = THostedPageTemplateId | 'blank';

/**
 * The template the page follows: the owner's pick in this editor session, else the template its
 * theme corresponds to (a saved page). The blank sheet shares its theme with a template, so only
 * the explicit pick can tell the two apart.
 */
export function resolveActiveTemplate(
	choice: HostedTemplateChoice | null | undefined,
	theme: THostedPageTheme | undefined,
): THostedPageTemplateId | null {
	if (choice === 'blank') return null;
	return choice ?? matchTemplate(theme);
}

/** Which template, if any, the current theme corresponds to. */
export function matchTemplate(theme: THostedPageTheme | undefined): THostedPageTemplateId | null {
	if (!theme) return null;
	const hit = HOSTED_PAGE_TEMPLATES.find((template) => {
		const expected = getTemplateTheme(template.id);
		return (
			expected.primaryColor === theme.primaryColor &&
			expected.accentColor === theme.accentColor &&
			expected.style === (theme.style ?? 'editorial') &&
			expected.font === theme.font &&
			expected.mode === (theme.mode ?? 'light')
		);
	});
	return hit?.id ?? null;
}
