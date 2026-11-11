import type {
	THostedPageType,
	THostedProductDocument,
	THostedProductParty,
} from '../schemas/HostedPage';
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

const presentParty = (party: THostedProductParty) => ({
	name: party.name,
	address: party.address,
	email: party.email || null,
	website: party.website || null,
	phone: party.phone || null,
});

const presentProductPage: THostedPagePresenter<'product'> = (
	data,
	{ fileUrl, assetUrl, draft },
) => {
	const present = (id: string, document: THostedProductDocument) => ({
		id,
		category: document.category,
		language: document.language,
		title: document.title || null,
		version: document.version || null,
		validFrom: document.validFrom ?? null,
		fileName: document.fileName,
		fileSize: document.fileSize,
		fileUrl: fileUrl(id),
		downloadUrl: fileUrl(id, true),
	});

	return {
		type: 'product',
		title: data.title,
		description: data.description || null,
		brandName: data.brandName || null,
		coverUrl: data.coverKey ? assetUrl(data.coverKey) : null,
		logoUrl: data.logoKey ? assetUrl(data.logoKey) : null,
		model: data.model,
		articleNumber: data.articleNumber || null,
		gtin: data.gtin || null,
		manufacturer: presentParty(data.manufacturer),
		euRepresentative: data.euRepresentative?.name ? presentParty(data.euRepresentative) : null,
		safetyNotice: data.safetyNotice || null,
		link:
			data.link?.label && (data.link.url || draft)
				? { label: data.link.label, url: data.link.url || '#' }
				: null,
		documents: data.documents.flatMap((document, index) => {
			const id = document.id ?? (draft ? `draft-${index}` : null);
			return id ? [present(id, document)] : [];
		}),
		archive: (data.archive ?? []).map((entry) => ({
			...present(entry.id, entry),
			documentId: entry.documentId,
			validUntil: entry.validUntil,
		})),
		paperRequestEmail: (data.paperRequest?.enabled && data.paperRequest.email) || null,
	};
};

/** One presenter per hosted page type. */
export const HOSTED_PAGE_PRESENTERS: { [K in THostedPageType]: THostedPagePresenter<K> } = {
	pdf: presentPdfPage,
	product: presentProductPage,
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
	// the single spot where the union of page types meets the union of presenters
	const present = HOSTED_PAGE_PRESENTERS[page.type] as THostedPagePresenter<THostedPageType>;
	return { ...base, ...present(page.data, context) } as TPublicHostedPageResponseDto;
}
