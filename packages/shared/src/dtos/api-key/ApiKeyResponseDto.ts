import { z } from 'zod';

export const ApiKeyResponseDto = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	createdAt: z.number(),
	lastUsedAt: z.number().nullable(),
	expiration: z.number().nullable(),
	revoked: z.boolean(),
});

export type TApiKeyResponseDto = z.infer<typeof ApiKeyResponseDto>;
