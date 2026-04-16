import { z } from 'zod';

export const API_KEY_NAME_MAX_LENGTH = 64;
export const API_KEY_DESCRIPTION_MAX_LENGTH = 256;

export const CreateApiKeyDto = z.object({
	name: z.string().min(1).max(API_KEY_NAME_MAX_LENGTH),
	description: z.string().max(API_KEY_DESCRIPTION_MAX_LENGTH).optional(),
	expiresInDays: z.number().int().positive().max(3650).optional().nullable(),
});

export type TCreateApiKeyDto = z.infer<typeof CreateApiKeyDto>;
