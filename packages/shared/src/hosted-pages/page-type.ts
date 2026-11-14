import type { THostedPageSettings, THostedUploadKind } from '../schemas/HostedPage';

/** A stored file a hosted page references, and the role it plays there. */
export type THostedFileRef = {
	key: string;
	kind: THostedUploadKind;
	/** Role on the page, e.g. "document", "cover" or "logo" */
	slot: string;
	/** Stable id of the document the file belongs to; survives file swaps */
	documentId?: string;
};

/**
 * A file the page's file endpoint streams, addressed by its document id. Type, size and storage come
 * from the stored file itself.
 */
export type THostedServedFile = {
	documentId: string;
	fileKey: string;
};

/** A rule the content breaks on input; stored content is read as it is. */
export type THostedInputIssue = { path: (string | number)[]; message: string };

export type THostedCarryOverContext = { now: Date; newId: () => string };

/**
 * Everything the platform needs to know about one hosted page type. Each type registers exactly
 * one of these; services, the public page and the editor ask the registry instead of checking
 * `content.type`. Functions are pure and return copies.
 */
export type THostedPageTypeDefinition<TData extends THostedPageSettings> = {
	/** Every uploaded file the content references */
	fileRefs(data: TData): THostedFileRef[];
	/** The content with one storage key swapped, e.g. after duplicating the files */
	replaceFileKey(data: TData, oldKey: string, newKey: string): TData;
	/** The content with file name and size taken from the stored upload instead of the client */
	withUploadMetadata(
		data: TData,
		upload: { fileKey: string; fileName: string; fileSize: number },
	): TData;
	/** The content with a stable id on every document; existing ids are kept */
	withDocumentIds(data: TData, newId: () => string): TData;
	/** Files a visitor can open, in page order */
	servedFiles(data: TData): THostedServedFile[];
	/** Document a scan opens instead of the page, when the owner chose to skip the page */
	directDocumentId(data: TData): string | null;
	/** Whether a scan shows a landing page; only such codes count against the landing page limit */
	showsLandingPage(data: TData): boolean;
	/** Links the page sends visitors to, screened like any redirect destination */
	outboundUrls(data: TData): string[];
	/** Rules across fields that new or changed content must follow (paths relative to the data) */
	inputIssues(data: TData): THostedInputIssue[];
	/**
	 * The content to store when `next` replaces `current` (null for a new page or a duplicate).
	 * What a type keeps of its past is decided here, on the server; clients cannot write it.
	 */
	carryOver(current: TData | null, next: TData, context: THostedCarryOverContext): TData;
};
