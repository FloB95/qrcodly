import { z } from 'zod';
import {
	DefaultDateWhereQueryParamSchema,
	DefaultStringWhereQueryParamSchema,
	PaginationQueryParamsSchema,
} from '../ListRequestDto';
import { QrCodeContentType } from '../../schemas/QrCode';

// Schema to validate the request query params for the GetCustomers controller action
const QrCodeWhereSchema = z.object({
	name: DefaultStringWhereQueryParamSchema,
	createdAt: DefaultDateWhereQueryParamSchema,
});

export const GetQrCodeQueryParamsSchema = PaginationQueryParamsSchema(QrCodeWhereSchema).extend({
	contentType: z
		.preprocess((val) => (typeof val === 'string' ? [val] : val), z.array(QrCodeContentType).min(1))
		.optional()
		.describe(
			'Filter by content type(s). Accepts one or more of: url, text, wifi, vCard, email, location, event, epc',
		),
	tagIds: z
		.preprocess((val) => (typeof val === 'string' ? [val] : val), z.array(z.string().uuid()).min(1))
		.optional()
		.describe(
			'Filter by tag ID(s). Only returns QR codes that have at least one of the specified tags',
		),
});
export type TGetQrCodeQueryParamsDto = z.infer<typeof GetQrCodeQueryParamsSchema>;
