import {
	getDefaultContentByType,
	getTemplatesForType,
	getTemplateTheme,
	isHostedPageContent,
	type THostedPageTemplateId,
	type THostedPageType,
	type TQrCodeContent,
} from '@shared/schemas';

/**
 * A new hosted page starts as its type's default content in the design of the type's first
 * template, whose sample texts fill the preview until the owner changes anything.
 */
export function freshHostedDraft(
	type: THostedPageType,
	/** A template of this type to show instead of the first one, e.g. from a landing page link */
	template?: string | null,
): {
	content: TQrCodeContent;
	sampleTemplate: THostedPageTemplateId | null;
} {
	const content = getDefaultContentByType(type, true);
	const templates = getTemplatesForType(type);
	const sampleTemplate =
		templates.find((entry) => entry.id === template)?.id ?? templates[0]?.id ?? null;
	if (!sampleTemplate || !isHostedPageContent(content)) return { content, sampleTemplate: null };
	return {
		content: {
			...content,
			data: { ...content.data, theme: getTemplateTheme(sampleTemplate) },
		} as TQrCodeContent,
		sampleTemplate,
	};
}
