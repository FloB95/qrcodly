import type { THostedPageType } from '../schemas/HostedPage';
import type { TPublicHostedPageResponseDto } from '../dtos/hosted-page/PublicHostedPageResponseDto';
import type { THostedPageBody, THostedPageBodyData } from './registry';

/** Fields every public page carries, decided once from the owner's plan and the page's address. */
export type TPublicPageBase = Pick<
	TPublicHostedPageResponseDto,
	'shortCode' | 'showBranding' | 'theme' | 'url'
>;

export type THostedPagePresenterContext = {
	/** Browser URL of a served file, inline or as download */
	fileUrl: (documentId: string, download?: boolean) => string;
	/** Public URL of an uploaded image */
	assetUrl: (fileKey: string) => string | null;
	/**
	 * The editor's live preview: unfinished parts (a button without its address, documents not
	 * saved yet) show as they will look once done. The public page leaves them out.
	 */
	draft?: boolean;
};

type TPageOf<K extends THostedPageType> = Extract<TPublicHostedPageResponseDto, { type: K }>;

/**
 * Turns the stored content of one page type into what visitors (and API clients) receive. The
 * public page and the editor's preview both use it, so they cannot drift apart.
 */
export type THostedPagePresenter<K extends THostedPageType> = (
	data: THostedPageBodyData<K>,
	context: THostedPagePresenterContext,
) => Omit<TPageOf<K>, keyof TPublicPageBase>;

const presentPdfPage: THostedPagePresenter<'pdf'> = (data, { fileUrl, assetUrl, draft }) => ({
	type: 'pdf',
	title: data.title,
	description: data.description || null,
	brandName: data.brandName || null,
	coverUrl: data.coverKey ? assetUrl(data.coverKey) : null,
	logoUrl: data.logoKey ? assetUrl(data.logoKey) : null,
	buttonLabel: data.buttonLabel || null,
	// a button needs its text; in the preview it shows before its address is set
	link:
		data.link?.label && (data.link.url || draft)
			? { label: data.link.label, url: data.link.url || '#' }
			: null,
	documents: data.documents.flatMap((document, index) => {
		const id = document.id ?? (draft ? `draft-${index}` : null);
		return id
			? [
					{
						id,
						title: document.title || document.fileName.replace(/\.pdf$/i, ''),
						fileName: document.fileName,
						fileSize: document.fileSize,
						fileUrl: fileUrl(id),
						downloadUrl: fileUrl(id, true),
					},
				]
			: [];
	}),
});

/** One presenter per hosted page type. */
export const HOSTED_PAGE_PRESENTERS: { [K in THostedPageType]: THostedPagePresenter<K> } = {
	pdf: presentPdfPage,
};

export function presentHostedPage<K extends THostedPageType>(
	page: { type: K; data: THostedPageBodyData<K> },
	base: TPublicPageBase,
	context: THostedPagePresenterContext,
): TPageOf<K>;
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
