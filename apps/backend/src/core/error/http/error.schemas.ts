import { z } from 'zod';

export const BaseErrorResponseSchema = z.object({
	message: z.string().describe('Human-readable error message'),
	code: z.number().describe('HTTP status code'),
});

export const BadRequestErrorResponseSchema = BaseErrorResponseSchema.extend({
	fieldErrors: z
		.record(z.any(), z.any())
		.optional()
		.describe('Field-level validation errors keyed by field name'),
}).describe('Bad Request — invalid input or validation failure');

export const ToManyRequestErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Too Many Requests — rate limit exceeded. Retry after the rate limit window resets.',
);

export const UnauthorizedErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Unauthorized — missing or invalid Bearer token.',
);

export const ForbiddenErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Forbidden — you do not have permission to access this resource.',
);

export const NotFoundErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Not Found — the requested resource does not exist.',
);

export const ConflictErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Conflict — the request conflicts with existing data.',
);

export const InternalServerErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Internal Server Error — an unexpected error occurred.',
);

export const ServiceUnavailableErrorResponseSchema = BaseErrorResponseSchema.describe(
	'Service Unavailable — an upstream service is temporarily unavailable. Retry after a short delay.',
);

export const DEFAULT_ERROR_RESPONSES = {
	400: BadRequestErrorResponseSchema,
	401: UnauthorizedErrorResponseSchema,
	403: ForbiddenErrorResponseSchema,
	404: NotFoundErrorResponseSchema,
	409: ConflictErrorResponseSchema,
	429: ToManyRequestErrorResponseSchema,
	500: InternalServerErrorResponseSchema,
	503: ServiceUnavailableErrorResponseSchema,
} as const;
