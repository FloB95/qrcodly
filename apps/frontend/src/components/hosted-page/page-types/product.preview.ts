import {
	presentHostedPage,
	type THostedDocumentCategory,
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

// what the sample documents of each template are, in the order its texts list them
const SAMPLE_CATEGORIES: Partial<Record<THostedPageTemplateId, THostedDocumentCategory[]>> = {
	productManual: ['manual', 'other', 'datasheet'],
	machineManual: ['manual', 'safety', 'declaration', 'datasheet'],
	homeAppliance: ['manual', 'safety', 'other'],
	powerTool: ['manual', 'safety', 'declaration'],
};

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
			category: SAMPLE_CATEGORIES[id]?.[index] ?? 'other',
			language: 'en',
			fileKey: `${prefix}:document:${index}`,
			fileName: `${title}.pdf`,
			fileSize: size(index),
		}));
}

// the model the sample's title names, so the type line matches the headline
const SAMPLE_MODELS: Partial<Record<string, string>> = {
	machineManual: 'BS 400',
	homeAppliance: 'W 800',
	powerTool: 'AB 18',
	productManual: 'X200',
};

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
		model: SAMPLE_MODELS[templateId] ?? 'X200',
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
