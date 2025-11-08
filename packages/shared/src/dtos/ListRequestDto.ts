import { z } from 'zod';

/**
 * Schema for default ID query parameter.
 */
export const DefaultIdQueryParamSchema = z.object({
	id: z.string(),
});

/**
 * Schema for default date where query parameter.
 */
export const QueryDateSchema = z
	.string()
	.refine((val) => !isNaN(Date.parse(val)), {
		error: 'Invalid date format',
	})
	.transform((val) => new Date(val));

/**
 * Schema for default string where query parameter.
 */
export const DefaultStringWhereQueryParamSchema = z
	.object({
		eq: z.string(),
		neq: z.string(),
		like: z.string(),
	})
	.partial()
	.optional();
export type DefaultStringWhereQueryParam = z.infer<typeof DefaultStringWhereQueryParamSchema>;

/**
 * Schema for default email where query parameter.
 */
export const DefaultEmailWhereQueryParamSchema = z
	.object({
		eq: z.email(),
		neq: z.email(),
		like: z.string(),
	})
	.partial()
	.optional();
export type DefaultEmailWhereQueryParam = z.infer<typeof DefaultEmailWhereQueryParamSchema>;

export const DefaultDateWhereQueryParamSchema = z
	.object({
		eq: QueryDateSchema,
		neq: QueryDateSchema,
		gt: QueryDateSchema,
		gte: QueryDateSchema,
		lt: QueryDateSchema,
		lte: QueryDateSchema,
	})
	.partial()
	.optional();

export type DefaultDateWhereQueryParam = z.infer<typeof DefaultDateWhereQueryParamSchema>;

/**
 * Schema for pagination query parameters.
 * @param whereObj The where object schema.
 * @returns A Zod object schema for pagination query parameters.
 */
export const PaginationQueryParamsSchema = (whereObj?: z.ZodObject<z.ZodRawShape>) =>
	z.object({
		page: z
			.string()
			.transform((val) => parseInt(val, 10))
			.refine((val) => Number.isInteger(val) && val > 0, {
				error: 'Page must be a positive integer greater than 0',
			})
			.prefault('1'),
		limit: z
			.string()
			.transform((val) => parseInt(val, 10))
			.refine((val) => Number.isInteger(val) && val > 0, {
				error: 'Limit must be a positive integer greater than 0',
			})
			.prefault('10'),
		where: whereObj ? whereObj.partial().optional() : z.undefined(),
	});

// this is for the swagger schema since we expect the where query param to be a string and not an object
export const BaseWhereQueryParamSchema = z.object({
	where: z
		.string()
		.optional()
		.describe(
			'String with the where clause for the query. Eg: name[eq]="lorem ipsum"&createdAt[gte]="2021-01-01T00:00:00.000Z"',
		),
});
