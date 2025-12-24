import { z } from 'zod';
import { QrCodeContentType, QrCodeSchema } from '../../schemas/QrCode';

export const CreateQrCodeDto = QrCodeSchema.pick({
	name: true,
	config: true,
	content: true,
});

export type TCreateQrCodeDto = z.infer<typeof CreateQrCodeDto>;

// const contentTypes = Object.keys(QrCodeContent) as TQrCodeContentType[];
export const BulkImportQrCodeDto = QrCodeSchema.pick({
	config: true,
}).extend({
	contentType: QrCodeContentType,
	file: z
		.instanceof(File, { error: 'Input is no file. Please upload a binary file.' })
		.refine((file) => ['text/csv'].includes(file.type), { error: 'Invalid document file type' })
		.refine((file) => file.size <= 2 * 1024 * 1024, {
			error: 'File size should not exceed 2MB',
		})
		.describe('Pass csv file as binary'),
});

export type TBulkImportQrCodeDto = z.infer<typeof BulkImportQrCodeDto>;
