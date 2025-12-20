import { z } from 'zod';

export const TokenTypeSchema = z.enum(['session_token', 'api_key', 'm2m_token', 'oauth_token']);
export type TTokenType = z.infer<typeof TokenTypeSchema>;

export const UserSchema = z.object({
	id: z.string(),
	tokenType: TokenTypeSchema,
});
export type TUser = z.infer<typeof UserSchema>;
