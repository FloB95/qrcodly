import { z } from 'zod';
import { HostedPageLinkSchema, HostedPageThemeSchema } from '../../schemas/HostedPage';

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

// One entry per hosted page type; a new type adds its page DTO here
export const PublicHostedPageResponseDto = z.discriminatedUnion('type', [PublicHostedPdfPageDto]);
export type TPublicHostedPageResponseDto = z.infer<typeof PublicHostedPageResponseDto>;
