import type {
	THostedPageBody,
	THostedPageBodyData,
	THostedPageType,
	TPublicHostedPageResponseDto,
} from '@shared/schemas';

/** Fields every public page carries, decided once from the owner's plan. */
type TPublicPageBase = Pick<
	TPublicHostedPageResponseDto,
	'shortCode' | 'showBranding' | 'theme' | 'url'
>;

export type THostedPagePresenterContext = {
	/** Browser URL of a served document, inline or as download */
	fileUrl: (documentId: string, download?: boolean) => string;
	/** Public URL of an uploaded image */
	assetUrl: (fileKey: string) => string;
};

type TPageOf<K extends THostedPageType> = Extract<TPublicHostedPageResponseDto, { type: K }>;

/** Turns the stored content of one page type into what visitors (and API clients) receive. */
export type THostedPagePresenter<K extends THostedPageType> = (
	data: THostedPageBodyData<K>,
	context: THostedPagePresenterContext,
) => Omit<TPageOf<K>, keyof TPublicPageBase>;

const presentPdfPage: THostedPagePresenter<'pdf'> = (data, { fileUrl, assetUrl }) => ({
	type: 'pdf',
	title: data.title,
	description: data.description ?? null,
	brandName: data.brandName ?? null,
	coverUrl: data.coverKey ? assetUrl(data.coverKey) : null,
	logoUrl: data.logoKey ? assetUrl(data.logoKey) : null,
	buttonLabel: data.buttonLabel ?? null,
	// a link without an address is still a draft in the editor
	link: data.link?.url ? data.link : null,
	documents: data.documents.flatMap((document) =>
		document.id
			? [
					{
						id: document.id,
						title: document.title || document.fileName.replace(/\.pdf$/i, ''),
						fileName: document.fileName,
						fileSize: document.fileSize,
						fileUrl: fileUrl(document.id),
						downloadUrl: fileUrl(document.id, true),
					},
				]
			: [],
	),
});

/** One presenter per hosted page type; the public page use case only dispatches. */
export const HOSTED_PAGE_PRESENTERS: { [K in THostedPageType]: THostedPagePresenter<K> } = {
	pdf: presentPdfPage,
};

export function presentHostedPage(
	page: THostedPageBody,
	base: TPublicPageBase,
	context: THostedPagePresenterContext,
): TPublicHostedPageResponseDto {
	// The single spot where the union of page types meets the union of presenters. With one page
	// type no cast is needed; a second type makes this fail to compile until a widening cast
	// (`as THostedPagePresenter<THostedPageType>`) is added here and nowhere else.
	const present: THostedPagePresenter<THostedPageType> = HOSTED_PAGE_PRESENTERS[page.type];
	return { ...base, ...present(page.data, context) };
}
