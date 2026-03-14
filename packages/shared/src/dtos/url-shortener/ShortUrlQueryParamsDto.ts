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
			.optional()
			.describe('If true, only returns standalone short URLs (not linked to a QR code)'),
		tagIds: z
			.preprocess(
				(val) => (typeof val === 'string' ? [val] : val),
				z.array(z.string().uuid()).min(1),
			)
			.optional()
			.describe(
				'Filter by tag ID(s). Only returns short URLs that have at least one of the specified tags',
			),
	},
);

export type TGetShortUrlQueryParamsDto = z.infer<typeof GetShortUrlQueryParamsSchema>;
