import { z } from 'zod';
import { ApiKeyScopeSchema } from './ApiKeyScope';
import { API_KEY_DESCRIPTION_MAX_LENGTH } from './CreateApiKeyDto';

// Clerk's update API doesn't support renaming, so `name` is intentionally omitted.
export const UpdateApiKeyDto = z
	.object({
		description: z.string().max(API_KEY_DESCRIPTION_MAX_LENGTH).nullable().optional(),
		scopes: z.array(ApiKeyScopeSchema).min(1).optional(),
		expiresInDays: z.number().int().positive().max(3650).nullable().optional(),
	})
	.refine((value) => Object.values(value).some((v) => v !== undefined), {
		message: 'At least one field must be provided',
	});

export type TUpdateApiKeyDto = z.infer<typeof UpdateApiKeyDto>;
