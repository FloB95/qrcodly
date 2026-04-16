import { z } from 'zod';
import { ApiKeyResponseDto } from './ApiKeyResponseDto';

export const ApiKeyListResponseDto = z.object({
	data: z.array(ApiKeyResponseDto),
});

export type TApiKeyListResponseDto = z.infer<typeof ApiKeyListResponseDto>;
