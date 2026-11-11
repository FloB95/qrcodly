import { type TProductPageData } from '../schemas/HostedPage';
import type { THostedPageTypeDefinition } from './page-type';

const swap = (value: string | undefined, oldKey: string, newKey: string) =>
	value === oldKey ? newKey : value;

const withFileKey = <T extends { fileKey: string }>(entry: T, oldKey: string, newKey: string): T =>
	entry.fileKey === oldKey ? { ...entry, fileKey: newKey } : entry;

/**
 * A page for one product model: its documents per category and language, the manufacturer and an
 * archive of every file a document used to have.
 */
export const productPageType: THostedPageTypeDefinition<TProductPageData> = {
	fileRefs: (data) => [
		...data.documents.map((document) => ({
			key: document.fileKey,
			kind: 'pdf' as const,
			slot: 'document',
			documentId: document.id,
		})),
		...(data.archive ?? []).map((entry) => ({
			key: entry.fileKey,
			kind: 'pdf' as const,
			slot: 'archive',
			documentId: entry.id,
		})),
		...(data.coverKey ? [{ key: data.coverKey, kind: 'image' as const, slot: 'cover' }] : []),
		...(data.logoKey ? [{ key: data.logoKey, kind: 'image' as const, slot: 'logo' }] : []),
	],

	replaceFileKey: (data, oldKey, newKey) => ({
		...data,
		documents: data.documents.map((document) => withFileKey(document, oldKey, newKey)),
		...(data.archive && {
			archive: data.archive.map((entry) => withFileKey(entry, oldKey, newKey)),
		}),
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

	servedFiles: (data) => [
		...data.documents.flatMap((document) =>
			document.id ? [{ documentId: document.id, fileKey: document.fileKey }] : [],
		),
		...(data.archive ?? []).map((entry) => ({ documentId: entry.id, fileKey: entry.fileKey })),
	],

	directDocumentId: () => null,

	showsLandingPage: () => true,

	outboundUrls: (data) =>
		[data.link?.url, data.manufacturer.website, data.euRepresentative?.website].filter(
			(url): url is string => !!url,
		),

	inputIssues: (data) => [
		...(!data.manufacturer.email && !data.manufacturer.website
			? [
					{
						path: ['manufacturer', 'email'],
						message: 'The manufacturer needs an e-mail address or a website as digital contact',
					},
				]
			: []),
		...(data.paperRequest?.enabled && !data.paperRequest.email
			? [
					{
						path: ['paperRequest', 'email'],
						message: 'Paper requests need an e-mail address they are sent to',
					},
				]
			: []),
	],

	// a replaced or removed file moves to the archive; the client's own archive list is never taken
	carryOver: (current, next, { now, newId }) => {
		const stamp = now.toISOString();
		const { removeArchiveIds, archive: _sent, ...content } = next;
		const before = new Map((current?.documents ?? []).map((document) => [document.id, document]));
		const documents = content.documents.map((document) => {
			const previous = document.id ? before.get(document.id) : undefined;
			return {
				...document,
				validFrom: previous?.fileKey === document.fileKey ? previous.validFrom : stamp,
			};
		});
		if (!current) return { ...content, documents };

		const liveKeys = new Set(documents.map((document) => document.fileKey));
		const removed = new Set(removeArchiveIds);
		const kept = (current.archive ?? []).filter(
			(entry) => !removed.has(entry.id) && !liveKeys.has(entry.fileKey),
		);
		const retired = current.documents.flatMap((document) =>
			document.id && !liveKeys.has(document.fileKey)
				? [{ ...document, id: newId(), documentId: document.id, validUntil: stamp }]
				: [],
		);
		return { ...content, documents, archive: [...retired, ...kept] };
	},
};
