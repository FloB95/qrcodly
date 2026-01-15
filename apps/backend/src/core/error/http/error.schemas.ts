import { z } from 'zod';

export const BaseErrorResponseSchema = z.object({
	message: z.string(),
	code: z.number(),
});

export const BadRequestErrorResponseSchema = BaseErrorResponseSchema.extend({
	fieldErrors: z.record(z.any(), z.any()).optional(),
}).describe('Bad Request Error Response');

export const ToManyRequestErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Too Many Requests Error Response',
);

export const UnauthorizedErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Unauthorized Error Response',
);

export const ForbiddenErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Forbidden Error Response',
);

export const NotFoundErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Not Found Error Response',
);

export const InternalServerErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Internal Server Error Response',
);

export const DEFAULT_ERROR_RESPONSES = {
	400: BadRequestErrorResponseSchema,
	401: UnauthorizedErrorResponseSchema,
	403: ForbiddenErrorResponseSchema,
	404: NotFoundErrorResponseSchema,
	429: ToManyRequestErrorResponseSchema,
	500: InternalServerErrorResponseSchema,
} as const;
