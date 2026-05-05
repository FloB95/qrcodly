import { z } from 'zod';
import { ApiKeyScopeSchema } from './ApiKeyScope';

export const ApiKeyResponseDto = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	createdAt: z.number(),
	lastUsedAt: z.number().nullable(),
	expiration: z.number().nullable(),
	revoked: z.boolean(),
	scopes: z.array(ApiKeyScopeSchema),
});

export type TApiKeyResponseDto = z.infer<typeof ApiKeyResponseDto>;
