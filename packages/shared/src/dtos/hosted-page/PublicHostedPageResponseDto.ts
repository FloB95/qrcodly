import { z } from 'zod';
import {
	HostedDocumentCategorySchema,
	HostedDocumentLanguageSchema,
	HostedPageLinkSchema,
	HostedPageThemeSchema,
} from '../../schemas/HostedPage';

const PublicHostedPageBase = z.object({
	shortCode: z.string().describe('Short code the page is served under'),
	showBranding: z.boolean().describe('Whether the "Made with QRcodly" footer is shown'),
	theme: HostedPageThemeSchema.describe('Effective page theme after applying plan rules'),
	url: z
		.string()
		.describe(
			'The one address the page is served at: the short URL in its QR code, on the custom domain when one is set',
		),
});

export const PublicHostedPdfDocumentDto = z.object({
	id: z.string().describe('Stable id of the document; stays the same when the file is replaced'),
	title: z.string().describe('Display name of the document'),
	fileName: z.string(),
	fileSize: z.number().int(),
	fileUrl: z.string().describe('Opens the PDF inline'),
	downloadUrl: z.string().describe('Downloads the PDF as attachment'),
});
export type TPublicHostedPdfDocumentDto = z.infer<typeof PublicHostedPdfDocumentDto>;

export const PublicHostedPdfPageDto = PublicHostedPageBase.extend({
	type: z.literal('pdf'),
	title: z.string(),
	description: z.string().nullable(),
	brandName: z.string().nullable(),
	coverUrl: z.string().nullable(),
	logoUrl: z.string().nullable(),
	buttonLabel: z.string().nullable(),
	link: HostedPageLinkSchema.nullable(),
	documents: z.array(PublicHostedPdfDocumentDto),
});
export type TPublicHostedPdfPageDto = z.infer<typeof PublicHostedPdfPageDto>;

export const PublicHostedProductPartyDto = z.object({
	name: z.string(),
	address: z.string(),
	email: z.string().nullable(),
	website: z.string().nullable(),
	phone: z.string().nullable(),
});
export type TPublicHostedProductPartyDto = z.infer<typeof PublicHostedProductPartyDto>;

export const PublicHostedProductDocumentDto = PublicHostedPdfDocumentDto.extend({
	title: z.string().nullable().describe('Display name; null means the name of the category'),
	category: HostedDocumentCategorySchema,
	language: HostedDocumentLanguageSchema,
	version: z.string().nullable().describe('Revision as the manufacturer names it'),
	validFrom: z.string().nullable().describe('When this file went online (ISO 8601)'),
});
export type TPublicHostedProductDocumentDto = z.infer<typeof PublicHostedProductDocumentDto>;

export const PublicHostedProductArchivedDocumentDto = PublicHostedProductDocumentDto.extend({
	documentId: z.string().describe('The document this file was a version of'),
	validUntil: z.string().describe('When the file was replaced or removed (ISO 8601)'),
});
export type TPublicHostedProductArchivedDocumentDto = z.infer<
	typeof PublicHostedProductArchivedDocumentDto
>;

export const PublicHostedProductPageDto = PublicHostedPageBase.extend({
	type: z.literal('product'),
	title: z.string(),
	description: z.string().nullable(),
	brandName: z.string().nullable(),
	coverUrl: z.string().nullable(),
	logoUrl: z.string().nullable(),
	model: z.string(),
	articleNumber: z.string().nullable(),
	gtin: z.string().nullable(),
	manufacturer: PublicHostedProductPartyDto,
	euRepresentative: PublicHostedProductPartyDto.nullable(),
	safetyNotice: z.string().nullable(),
	link: HostedPageLinkSchema.nullable(),
	documents: z.array(PublicHostedProductDocumentDto),
	archive: z.array(PublicHostedProductArchivedDocumentDto),
	paperRequest: z.boolean().describe('Whether visitors can request a paper copy'),
});
export type TPublicHostedProductPageDto = z.infer<typeof PublicHostedProductPageDto>;

// One entry per hosted page type; a new type adds its page DTO here
export const PublicHostedPageResponseDto = z.discriminatedUnion('type', [
	PublicHostedPdfPageDto,
	PublicHostedProductPageDto,
]);
export type TPublicHostedPageResponseDto = z.infer<typeof PublicHostedPageResponseDto>;
