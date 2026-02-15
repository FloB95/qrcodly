import { z } from 'zod';
import {
	DefaultDateWhereQueryParamSchema,
	DefaultStringWhereQueryParamSchema,
	PaginationQueryParamsSchema,
} from '../ListRequestDto';

const TagWhereSchema = z.object({
	name: DefaultStringWhereQueryParamSchema,
	createdAt: DefaultDateWhereQueryParamSchema,
});

export const GetTagQueryParamsSchema = PaginationQueryParamsSchema(TagWhereSchema);
export type TGetTagQueryParamsDto = z.infer<typeof GetTagQueryParamsSchema>;
