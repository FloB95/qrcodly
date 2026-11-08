import { z } from 'zod';
import { HostedUploadKindSchema } from '../../schemas/HostedPage';

export const HostedUploadDto = z.object({
	kind: HostedUploadKindSchema.describe(
		'"pdf" for a document of a PDF page, "image" for a cover or logo image',
	),
	file: z
		.instanceof(File, { error: 'Input is no file. Please upload a binary file.' })
		.describe('Pass the file as binary multipart part'),
});
export type THostedUploadDto = z.infer<typeof HostedUploadDto>;

export const HostedUploadResponseDto = z.object({
	kind: HostedUploadKindSchema,
	fileKey: z.string().describe('Storage key to put into the QR code content'),
	fileName: z.string().describe('Original file name'),
	fileSize: z.number().int().describe('File size in bytes'),
	contentType: z.string().describe('Detected MIME type'),
	url: z
		.string()
		.nullable()
		.describe(
			'Public URL of an uploaded image, e.g. for a preview while editing. Null for documents, which are only served through the page',
		),
});
export type THostedUploadResponseDto = z.infer<typeof HostedUploadResponseDto>;
