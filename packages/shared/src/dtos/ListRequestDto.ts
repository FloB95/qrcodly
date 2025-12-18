import { z } from 'zod';

/**
 * Schema for default ID query parameter.
 */
export const DefaultIdQueryParamSchema = z.object({
	id: z.string(),
});

/**
 * Schema for default date where query parameter.
 * Transform is now handled via preprocess to be JSON Schema compatible.
 */
export const QueryDateSchema = z.preprocess((arg) => {
	if (arg instanceof Date) return arg.toISOString();
	return arg;
}, z.iso.datetime());

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
		eq: z.string().email(),
		neq: z.string().email(),
		like: z.string(),
	})
	.partial()
	.optional();
export type DefaultEmailWhereQueryParam = z.infer<typeof DefaultEmailWhereQueryParamSchema>;

/**
 * Schema for default date where query parameter.
 */
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
 */
export const PaginationQueryParamsSchema = (whereObj?: z.ZodObject<z.ZodRawShape>) =>
	z.object({
		page: z
			.preprocess(
				(val) => (typeof val === 'string' ? parseInt(val, 10) : val),
				z.number().int().min(1).max(1000),
			)
			.default(1),
		limit: z
			.preprocess(
				(val) => (typeof val === 'string' ? parseInt(val, 10) : val),
				z.number().int().min(1).max(100),
			)
			.default(10),
		where: whereObj ? whereObj.partial().optional() : z.undefined(),
	});

/**
 * Base schema for where query parameter (as string for Swagger/OpenAPI).
 */
export const BaseWhereQueryParamSchema = z.object({
	where: z
		.string()
		.optional()
		.describe(
			'String with the where clause for the query. Eg: name[eq]="lorem ipsum"&createdAt[gte]="2021-01-01T00:00:00.000Z"',
		),
});
