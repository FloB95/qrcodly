import { z } from 'zod';
import { QrCodeContentType, QrCodeOptionsSchema, QrCodeSchema } from '../../schemas/QrCode';
import { validateContentHttpUrls } from './validateContentHttpUrls';

export const CreateQrCodeDto = QrCodeSchema.pick({
	name: true,
	content: true,
})
	.extend({
		config: QrCodeOptionsSchema.optional().describe(
			'QR code visual styling configuration. Optional when templateId is provided — the template styling will be used as the base. Any fields provided here override the template values.',
		),
		templateId: z
			.string()
			.uuid()
			.optional()
			.describe(
				'ID of a saved design template to apply. The template styling (colors, shapes, logo) is used as the base config. You can override individual fields via the config parameter.',
			),
	})
	.superRefine((data, ctx) => {
		validateContentHttpUrls(data.content, ctx);
	});

export type TCreateQrCodeDto = z.infer<typeof CreateQrCodeDto>;

// const contentTypes = Object.keys(QrCodeContent) as TQrCodeContentType[];
export const BulkImportQrCodeDto = QrCodeSchema.pick({
	config: true,
}).extend({
	contentType: QrCodeContentType.describe(
		'Content type for all QR codes in the import: url, text, wifi, vCard, email, location, event, or epc',
	),
	file: z
		.instanceof(File, { error: 'Input is no file. Please upload a binary file.' })
		.refine((file) => ['text/csv'].includes(file.type), { error: 'Invalid document file type' })
		.refine((file) => file.size <= 2 * 1024 * 1024, {
			error: 'File size should not exceed 2MB',
		})
		.describe('Pass csv file as binary'),
});

export type TBulkImportQrCodeDto = z.infer<typeof BulkImportQrCodeDto>;
