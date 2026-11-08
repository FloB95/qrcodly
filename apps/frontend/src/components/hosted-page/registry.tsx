import type { ComponentType } from 'react';
import type {
	THostedPageData,
	THostedPageTemplateId,
	THostedPageType,
	TPublicHostedPageResponseDto,
} from '@shared/schemas';
import type { PreviewOptions, TemplateTranslator } from './preview';
import { HostedPdfPage } from './HostedPdfPage';
import { pdfPreview } from './page-types/pdf.preview';

type TPageOf<K extends THostedPageType> = Extract<TPublicHostedPageResponseDto, { type: K }>;

/** How a page type is rendered for visitors. */
type HostedPageView<K extends THostedPageType> = {
	Page: ComponentType<{ page: TPageOf<K>; preview?: boolean }>;
	/** Title and description for link previews and the browser tab */
	describe: (page: TPageOf<K>) => { title: string; description: string };
};

/** How the editor previews a page type, including the template sample shown before any edit. */
export type HostedPagePreviewDefinition<K extends THostedPageType> = {
	build: (data: THostedPageData<K>, options: PreviewOptions) => TPageOf<K>;
	isUntouched: (data: THostedPageData<K>) => boolean;
	/** The template's page as if an owner had filled it in */
	sample: (
		data: THostedPageData<K>,
		t: TemplateTranslator,
		templateId: THostedPageTemplateId,
	) => THostedPageData<K>;
	/** Stand-ins for files the template expects but the owner has not uploaded yet */
	withPlaceholders: (
		data: THostedPageData<K>,
		t: TemplateTranslator,
		templateId: THostedPageTemplateId,
	) => THostedPageData<K>;
	/** Storage keys of the images the content shows */
	imageKeys: (data: THostedPageData<K>) => string[];
};

/** The frontend counterpart of `HOSTED_PAGE_TYPE_DEFINITIONS`: one entry per page type. */
export const HOSTED_PAGE_VIEWS: { [K in THostedPageType]: HostedPageView<K> } = {
	pdf: {
		Page: HostedPdfPage,
		describe: (page) => ({
			title: page.title,
			description: page.description ?? page.brandName ?? page.documents[0]?.title ?? '',
		}),
	},
};

export const HOSTED_PAGE_PREVIEWS: { [K in THostedPageType]: HostedPagePreviewDefinition<K> } = {
	pdf: pdfPreview,
};

// The single spots where the union of page types meets the union of views and previews. With one
// page type no cast is needed; a second type makes these lines fail to compile until a widening
// cast (`as HostedPageView<THostedPageType>`) is added here and nowhere else.
export function viewOf(type: THostedPageType): HostedPageView<THostedPageType> {
	return HOSTED_PAGE_VIEWS[type];
}
export function previewOf(type: THostedPageType): HostedPagePreviewDefinition<THostedPageType> {
	return HOSTED_PAGE_PREVIEWS[type];
}

export function HostedPageView({
	page,
	preview,
}: {
	page: TPublicHostedPageResponseDto;
	preview?: boolean;
}) {
	const { Page } = viewOf(page.type);
	return <Page page={page} preview={preview} />;
}

export function describeHostedPage(page: TPublicHostedPageResponseDto) {
	return viewOf(page.type).describe(page);
}
