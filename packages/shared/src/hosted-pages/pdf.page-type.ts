import { PdfPageDataSchema, type TPdfPageData } from '../schemas/HostedPage';
import type { THostedPageTypeDefinition } from './page-type';

const swap = (value: string | undefined, oldKey: string, newKey: string) =>
	value === oldKey ? newKey : value;

/** A landing page around one or more PDF documents, with an optional cover and logo. */
export const pdfPageType: THostedPageTypeDefinition<TPdfPageData> = {
	inputSchema: PdfPageDataSchema,

	fileRefs: (data) => [
		...data.documents.map((document) => ({
			key: document.fileKey,
			kind: 'pdf' as const,
			slot: 'document',
			documentId: document.id,
		})),
		...(data.coverKey ? [{ key: data.coverKey, kind: 'image' as const, slot: 'cover' }] : []),
		...(data.logoKey ? [{ key: data.logoKey, kind: 'image' as const, slot: 'logo' }] : []),
	],

	replaceFileKey: (data, oldKey, newKey) => ({
		...data,
		documents: data.documents.map((document) =>
			document.fileKey === oldKey ? { ...document, fileKey: newKey } : document,
		),
		coverKey: swap(data.coverKey, oldKey, newKey),
		logoKey: swap(data.logoKey, oldKey, newKey),
	}),

	withUploadMetadata: (data, upload) => ({
		...data,
		documents: data.documents.map((document) =>
			document.fileKey === upload.fileKey
				? { ...document, fileName: upload.fileName, fileSize: upload.fileSize }
				: document,
		),
	}),

	withDocumentIds: (data, newId) => ({
		...data,
		documents: data.documents.map((document) =>
			document.id ? document : { ...document, id: newId() },
		),
	}),

	servedFiles: (data) =>
		data.documents.flatMap((document) =>
			document.id
				? [
						{
							documentId: document.id,
							fileKey: document.fileKey,
							fileName: document.fileName,
							fileSize: document.fileSize,
							contentType: 'application/pdf',
						},
					]
				: [],
		),

	directDocumentId: (data) => (data.openMode === 'direct' ? (data.documents[0]?.id ?? null) : null),

	showsLandingPage: (data) => data.openMode !== 'direct',

	outboundUrls: (data) => (data.link?.url ? [data.link.url] : []),

	fileRetention: 'grace',
};
