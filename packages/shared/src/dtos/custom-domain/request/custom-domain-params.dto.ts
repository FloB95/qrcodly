import { z } from 'zod';

/**
 * Request params for custom domain endpoints.
 */
export const CustomDomainIdParamsDto = z.object({
	id: z.uuid(),
});

export type TCustomDomainIdParamsDto = z.infer<typeof CustomDomainIdParamsDto>;

/**
 * Request query params for listing custom domains.
 */
export const CustomDomainListQueryDto = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10),
});

export type TCustomDomainListQueryDto = z.infer<typeof CustomDomainListQueryDto>;
