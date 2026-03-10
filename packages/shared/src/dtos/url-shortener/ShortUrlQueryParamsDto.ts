import { z } from 'zod';
import { DefaultStringWhereQueryParamSchema, PaginationQueryParamsSchema } from '../ListRequestDto';

const ShortUrlWhereSchema = z.object({
	destinationUrl: DefaultStringWhereQueryParamSchema,
	shortCode: DefaultStringWhereQueryParamSchema,
});

export const GetShortUrlQueryParamsSchema = PaginationQueryParamsSchema(ShortUrlWhereSchema).extend(
	{
		standalone: z
			.preprocess((val) => {
				if (typeof val === 'string') return val === 'true';
				return val;
			}, z.boolean())
			.optional(),
	},
);

export type TGetShortUrlQueryParamsDto = z.infer<typeof GetShortUrlQueryParamsSchema>;
