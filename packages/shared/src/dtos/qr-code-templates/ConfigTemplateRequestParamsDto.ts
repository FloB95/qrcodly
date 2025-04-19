import { z } from 'zod';
import {
	DefaultDateWhereQueryParamSchema,
	DefaultStringWhereQueryParamSchema,
	PaginationQueryParamsSchema,
} from '../ListRequestDto';

// Schema to validate the request query params for the GetCustomers controller action
const ConfigTemplateWhereSchema = z.object({
	name: DefaultStringWhereQueryParamSchema,
	createdAt: DefaultDateWhereQueryParamSchema,
});

export const GetConfigTemplateQueryParamsDto =
	PaginationQueryParamsSchema(ConfigTemplateWhereSchema);
export type TGetConfigTemplateQueryParamsDto = z.infer<typeof GetConfigTemplateQueryParamsDto>;
