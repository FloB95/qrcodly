import type { TQrCodeContent } from '@shared/schemas';

/** What a hosted page holds, for analytics: counts and switches only, never its texts or files. */
export function hostedTrackingProps(content: TQrCodeContent): Record<string, unknown> {
	if (content.type === 'pdf') {
		return {
			documentCount: content.data.documents.length,
			openMode: content.data.openMode ?? 'page',
		};
	}
	if (content.type === 'product') {
		const { documents, archive, paperRequest, euRepresentative, safetyNotice } = content.data;
		return {
			documentCount: documents.length,
			languageCount: new Set(documents.map((document) => document.language)).size,
			documentCategories: [...new Set(documents.map((document) => document.category))],
			archivedCount: archive?.length ?? 0,
			paperRequest: paperRequest?.enabled === true,
			euRepresentative: Boolean(euRepresentative),
			safetyNotice: Boolean(safetyNotice),
		};
	}
	return {};
}
