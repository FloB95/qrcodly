/** Path under a page's address that serves its files: `<pageUrl>/file/<documentId>`. */
export const HOSTED_FILE_PATH_SEGMENT = 'file';

/** A file of a hosted page, served under the page's own address (short URL or custom domain). */
export const hostedFileUrl = (pageUrl: string, documentId: string, download = false): string =>
	`${pageUrl}/${HOSTED_FILE_PATH_SEGMENT}/${encodeURIComponent(documentId)}${download ? '?download=1' : ''}`;
