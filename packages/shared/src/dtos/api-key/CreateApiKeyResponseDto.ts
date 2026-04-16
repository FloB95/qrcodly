import { z } from 'zod';
import { ApiKeyResponseDto } from './ApiKeyResponseDto';

export const CreateApiKeyResponseDto = ApiKeyResponseDto.extend({
	secret: z.string(),
});

export type TCreateApiKeyResponseDto = z.infer<typeof CreateApiKeyResponseDto>;
