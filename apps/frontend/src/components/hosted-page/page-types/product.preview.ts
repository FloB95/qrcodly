import {
	HOSTED_DOCUMENT_CATEGORIES,
	presentHostedPage,
	type THostedPageTemplateId,
	type THostedProductDocument,
	type TProductInput,
} from '@shared/schemas';
import {
	resolvePreviewTheme,
	SAMPLE_COVER_KEY,
	SAMPLE_LOGO_KEY,
	type TemplateTranslator,
} from '../preview';
import type { HostedPagePreviewDefinition } from '../registry';

/** The owner has not put anything of their own on the page yet. */
export function isProductContentUntouched(data: TProductInput): boolean {
	return (
		!data.title &&
		!data.model &&
		!data.description &&
		!data.brandName &&
		!data.manufacturer.name &&
		!data.manufacturer.address &&
		!data.coverKey &&
		!data.logoKey &&
		data.documents.length === 0
	);
}

/** The documents a template expects, as stand-ins: `size` 0 marks one still to be uploaded. */
function templateDocuments(
	t: TemplateTranslator,
	id: THostedPageTemplateId,
	prefix: string,
	size: (index: number) => number,
): THostedProductDocument[] {
	return t(`${id}.sample.documents`)
		.split('|')
		.map((title) => title.trim())
		.filter(Boolean)
		.map((title, index) => ({
			id: `${prefix}-${index}`,
			title,
			category: HOSTED_DOCUMENT_CATEGORIES[index] ?? 'other',
			language: 'en',
			fileKey: `${prefix}:document:${index}`,
			fileName: `${title}.pdf`,
			fileSize: size(index),
		}));
}

export const productPreview: HostedPagePreviewDefinition<'product'> = {
	build: (data, options) =>
		presentHostedPage(
			{ type: 'product', data },
			{
				shortCode: options.shortCode ?? '',
				url: '',
				showBranding: !(options.hasProPlan && data.hideBranding),
				theme: resolvePreviewTheme(data, options.hasProPlan),
			},
			{
				fileUrl: () => '#',
				assetUrl: (key) => options.assetUrls?.[key] ?? null,
				draft: true,
			},
		),

	isUntouched: isProductContentUntouched,

	sample: (data, t, templateId) => ({
		...data,
		title: t(`${templateId}.sample.title`),
		description: t(`${templateId}.sample.description`),
		brandName: t(`${templateId}.sample.brandName`),
		model: 'X200',
		manufacturer: {
			name: t(`${templateId}.sample.brandName`),
			address: t(`${templateId}.sample.address`),
			email: 'service@example.com',
		},
		link: { label: t(`${templateId}.linkLabel`), url: '' },
		coverKey: SAMPLE_COVER_KEY,
		logoKey: SAMPLE_LOGO_KEY,
		documents: templateDocuments(t, templateId, 'sample', (index) => 640_000 + index * 380_000),
	}),

	withPlaceholders: (data, t, templateId) =>
		data.documents.length > 0
			? data
			: { ...data, documents: templateDocuments(t, templateId, 'ghost', () => 0) },

	imageKeys: (data) => [data.coverKey, data.logoKey].filter((key): key is string => !!key),
};
