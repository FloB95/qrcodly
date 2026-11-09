import type { TQrCodeContent } from '../schemas/QrCode';
import { HOSTED_PAGE_TYPES, type THostedPageType } from '../schemas/HostedPage';
import type {
	THostedFileRef,
	THostedInputIssue,
	THostedPageTypeDefinition,
	THostedServedFile,
} from './page-type';
import { pdfPageType } from './pdf.page-type';

/** Content of a hosted page type as the QR code API carries it (the page data plus QR flags). */
export type THostedPageData<K extends THostedPageType> = Extract<
	TQrCodeContent,
	{ type: K }
>['data'];
export type THostedPageContent = Extract<TQrCodeContent, { type: THostedPageType }>;

/** Data of a hosted page type as the page itself stores it, independent of any QR code. */
export type THostedPageBodyData<K extends THostedPageType> = Omit<THostedPageData<K>, 'isDynamic'>;
/** A hosted page: its type and data. */
export type THostedPageBody = {
	[K in THostedPageType]: { type: K; data: THostedPageBodyData<K> };
}[THostedPageType];

/** Anything the registry helpers read: QR code content or a stored page. */
type THostedSource = TQrCodeContent | THostedPageBody;

/** The one place a new hosted page type is registered. */
export const HOSTED_PAGE_TYPE_DEFINITIONS: {
	[K in THostedPageType]: THostedPageTypeDefinition<THostedPageBodyData<K>>;
} = {
	pdf: pdfPageType,
};

export function isHostedPageType(type: string): type is THostedPageType {
	return (HOSTED_PAGE_TYPES as readonly string[]).includes(type);
}

export function isHostedPageContent(content: TQrCodeContent): content is THostedPageContent {
	return isHostedPageType(content.type);
}

const isHosted = (content: THostedSource): content is THostedPageContent | THostedPageBody =>
	isHostedPageType(content.type);

/** Which hosted page a QR code's content maps to, or null when the scan should redirect as usual. */
export function getHostedPageType(content: TQrCodeContent): THostedPageType | null {
	return isHostedPageContent(content) ? content.type : null;
}

/**
 * The definition of the content's page type, typed for its data. The cast is the single spot
 * where the union of page types meets the union of definitions.
 */
function definitionOf(
	content: THostedPageContent | THostedPageBody,
): THostedPageTypeDefinition<THostedPageBody['data']> {
	return HOSTED_PAGE_TYPE_DEFINITIONS[content.type] as THostedPageTypeDefinition<
		THostedPageBody['data']
	>;
}

// definitions return copies built by spreading, so QR flags such as isDynamic survive the map
const mapData = <T extends THostedSource>(
	content: T,
	map: (data: THostedPageBody['data'], definition: ReturnType<typeof definitionOf>) => unknown,
): T =>
	isHosted(content)
		? ({ ...content, data: map(content.data, definitionOf(content)) } as T)
		: content;

export function getHostedFileRefs(content: THostedSource): THostedFileRef[] {
	return isHosted(content) ? definitionOf(content).fileRefs(content.data) : [];
}

export function getHostedServedFiles(content: THostedSource): THostedServedFile[] {
	return isHosted(content) ? definitionOf(content).servedFiles(content.data) : [];
}

/** Id of the document a scan opens directly, or null when the scan shows the page. */
export function getDirectDocumentId(content: THostedSource): string | null {
	return isHosted(content) ? definitionOf(content).directDocumentId(content.data) : null;
}

export function getHostedOutboundUrls(content: THostedSource): string[] {
	return isHosted(content) ? definitionOf(content).outboundUrls(content.data) : [];
}

export function getHostedInputIssues(content: THostedSource): THostedInputIssue[] {
	return isHosted(content) ? definitionOf(content).inputIssues(content.data) : [];
}

/** Whether a scan shows a landing page (and takes a landing page slot). */
export function showsLandingPage(content: THostedSource): boolean {
	return isHosted(content) && definitionOf(content).showsLandingPage(content.data);
}

export const replaceHostedFileKey = <T extends THostedSource>(
	content: T,
	oldKey: string,
	newKey: string,
): T => mapData(content, (data, definition) => definition.replaceFileKey(data, oldKey, newKey));

export const withHostedUploadMetadata = <T extends THostedSource>(
	content: T,
	upload: { fileKey: string; fileName: string; fileSize: number },
): T => mapData(content, (data, definition) => definition.withUploadMetadata(data, upload));

export const HOSTED_FILE_KEY_MASK = 'hidden';

/** The content with every storage key masked, for places that show a code but must not hand out its files. */
export const withoutHostedFileKeys = <T extends THostedSource>(content: T): T =>
	getHostedFileRefs(content).reduce(
		(masked, ref) => replaceHostedFileKey(masked, ref.key, HOSTED_FILE_KEY_MASK),
		content,
	);

export const withHostedDocumentIds = <T extends THostedSource>(
	content: T,
	newId: () => string,
): T => mapData(content, (data, definition) => definition.withDocumentIds(data, newId));
