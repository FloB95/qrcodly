import { z } from 'zod';
import {
	DefaultDateWhereQueryParamSchema,
	DefaultStringWhereQueryParamSchema,
	PaginationQueryParamsSchema,
} from '../ListRequestDto';

// Schema to validate the request query params for the GetCustomers controller action
const QrCodeWhereSchema = z.object({
	name: DefaultStringWhereQueryParamSchema,
	createdAt: DefaultDateWhereQueryParamSchema,
});

export const GetQrCodeQueryParamsSchema = PaginationQueryParamsSchema(QrCodeWhereSchema);
export type TGetQrCodeQueryParamsDto = z.infer<typeof GetQrCodeQueryParamsSchema>;
