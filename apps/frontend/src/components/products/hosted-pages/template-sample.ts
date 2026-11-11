import {
	getDefaultContentByType,
	getTemplateTheme,
	HOSTED_PAGE_TEMPLATES,
	type THostedPageTemplateId,
	type THostedPageType,
	type TPublicHostedPageResponseDto,
} from '@shared/schemas';
import {
	hostedTemplateAssetUrls as assetUrlsOf,
	type TemplateTranslator,
} from '@/components/hosted-page/preview';
import { pdfPreview } from '@/components/hosted-page/page-types/pdf.preview';
import { productPreview } from '@/components/hosted-page/page-types/product.preview';

/** Every document of a demo page opens this file, shipped with the site */
const DEMO_DOCUMENT = '/hosted-templates/demo-document.pdf';
/** Where a demo's link button leads: the domain reserved for examples */
const DEMO_LINK = 'https://example.com';

export const templateTypeOf = (template: THostedPageTemplateId): THostedPageType | null =>
	HOSTED_PAGE_TEMPLATES.find((entry) => entry.id === template)?.type ?? null;

/** URL slug of a template's demo page, e.g. restaurantMenu → restaurant-menu */
export const demoSlug = (template: THostedPageTemplateId) =>
	template.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export const templateFromDemoSlug = (slug: string): THostedPageTemplateId | null =>
	HOSTED_PAGE_TEMPLATES.find((entry) => demoSlug(entry.id) === slug)?.id ?? null;

export const demoPath = (template: THostedPageTemplateId) =>
	`/products/hosted-pages/demo/${demoSlug(template)}`;

/** The template's sample page, built by the same preview code the editor uses. */
export function samplePage(
	template: THostedPageTemplateId,
	t: TemplateTranslator,
): TPublicHostedPageResponseDto | null {
	const type = templateTypeOf(template);
	const options = { hasProPlan: true, assetUrls: assetUrlsOf(template) };
	const theme = getTemplateTheme(template);
	if (type === 'product') {
		const empty = getDefaultContentByType('product', true);
		if (empty.type !== 'product') return null;
		const data = productPreview.sample(
			{ ...empty.data, theme, paperRequest: { enabled: true, email: 'service@example.com' } },
			t,
			template,
		);
		return productPreview.build(data, options);
	}
	const empty = getDefaultContentByType('pdf', true);
	if (empty.type !== 'pdf') return null;
	return pdfPreview.build(pdfPreview.sample({ ...empty.data, theme }, t, template), options);
}

/** The sample page as a visitor would get it, with documents that really open. */
export function demoPage(
	template: THostedPageTemplateId,
	t: TemplateTranslator,
): TPublicHostedPageResponseDto | null {
	const page = samplePage(template, t);
	if (!page) return null;
	const openable = <T extends { fileUrl: string; downloadUrl: string }>(document: T): T => ({
		...document,
		fileUrl: DEMO_DOCUMENT,
		downloadUrl: DEMO_DOCUMENT,
	});
	const link = page.link && { ...page.link, url: DEMO_LINK };
	if (page.type === 'product') {
		return {
			...page,
			link,
			documents: page.documents.map(openable),
			archive: page.archive.map(openable),
		};
	}
	if (page.type === 'pdf') return { ...page, link, documents: page.documents.map(openable) };
	return page;
}
