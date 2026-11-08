import type { z } from 'zod';
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

/** A file the public file endpoint streams, addressed by its document id. */
export type THostedServedFile = {
	documentId: string;
	fileKey: string;
	fileName: string;
	fileSize: number;
	contentType: string;
};

/**
 * What a replaced or removed file is worth keeping for: "grace" keeps it for the configured
 * retention period (an undo window), "forever" never deletes it (e.g. versioned product pages).
 */
export type THostedFileRetention = 'grace' | 'forever';

/**
 * Everything the platform needs to know about one hosted page type. Each type registers exactly
 * one of these; services, the public page and the editor ask the registry instead of checking
 * `content.type`. Functions are pure and return copies.
 */
export type THostedPageTypeDefinition<TData extends THostedPageSettings> = {
	inputSchema: z.ZodType<TData>;
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
	fileRetention: THostedFileRetention;
};
