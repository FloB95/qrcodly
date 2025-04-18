import {
	DefaultDateWhereQueryParamSchema,
	PaginationQueryParamsSchema,
} from '@/core/domain/dto/ListRequestDto';
import { z } from 'zod';

// Schema to validate the request query params for the GetCustomers controller action
const QrCodeWhereSchema = z.object({
	createdAt: DefaultDateWhereQueryParamSchema,
});

export const GetQrCodeQueryParamsSchema = PaginationQueryParamsSchema(QrCodeWhereSchema);
export type TGetQrCodeQueryParamsDto = z.infer<typeof GetQrCodeQueryParamsSchema>;
