import { presentHostedPage, type THostedPageTemplateId, type TPdfInput } from '@shared/schemas';
import {
	resolvePreviewTheme,
	SAMPLE_COVER_KEY,
	SAMPLE_LOGO_KEY,
	type TemplateTranslator,
} from '../preview';
import type { HostedPagePreviewDefinition } from '../registry';

/** Sample texts of a PDF template, from `generator.contentSwitch.hosted.templates.<id>`. */
export type PdfSampleTexts = {
	title: string;
	description: string;
	brandName: string;
	buttonLabel: string;
	linkLabel: string;
	/** Document titles the template expects */
	documents: string[];
};

export function readPdfSampleTexts(
	t: TemplateTranslator,
	id: THostedPageTemplateId,
): PdfSampleTexts {
	return {
		title: t(`${id}.sample.title`),
		description: t(`${id}.sample.description`),
		brandName: t(`${id}.sample.brandName`),
		buttonLabel: t(`${id}.buttonLabel`),
		linkLabel: t(`${id}.linkLabel`),
		documents: t(`${id}.sample.documents`)
			.split('|')
			.map((title) => title.trim())
			.filter(Boolean),
	};
}

/** The owner has not put anything of their own on the page yet. */
export function isPdfContentUntouched(data: TPdfInput): boolean {
	return (
		!data.title &&
		!data.description &&
		!data.brandName &&
		!data.buttonLabel &&
		!data.link &&
		!data.coverKey &&
		!data.logoKey &&
		data.documents.length === 0
	);
}

export const pdfPreview: HostedPagePreviewDefinition<'pdf'> = {
	// the same presenter as the public page, in draft mode: a started link button already shows
	build: (data, options) =>
		presentHostedPage(
			{ type: 'pdf', data },
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

	isUntouched: isPdfContentUntouched,

	sample: (data, t, templateId) => {
		const texts = readPdfSampleTexts(t, templateId);
		return {
			...data,
			title: texts.title,
			description: texts.description,
			brandName: texts.brandName,
			buttonLabel: texts.buttonLabel,
			link: { label: texts.linkLabel, url: '' },
			coverKey: SAMPLE_COVER_KEY,
			logoKey: SAMPLE_LOGO_KEY,
			documents: texts.documents.map((title, index) => ({
				id: `sample-${index}`,
				title,
				fileKey: `sample:document:${index}`,
				fileName: `${title}.pdf`,
				fileSize: 640_000 + index * 380_000,
			})),
		};
	},

	withPlaceholders: (data, t, templateId) => {
		if (data.documents.length > 0) return data;
		// size 0 marks a stand-in for a document the template expects but the owner has not uploaded
		return {
			...data,
			documents: readPdfSampleTexts(t, templateId).documents.map((title, index) => ({
				id: `placeholder-${index}`,
				title,
				fileKey: `ghost:document:${index}`,
				fileName: `${title}.pdf`,
				fileSize: 0,
			})),
		};
	},

	imageKeys: (data) => [data.coverKey, data.logoKey].filter((key): key is string => !!key),
};
