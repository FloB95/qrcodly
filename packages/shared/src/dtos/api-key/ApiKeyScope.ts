import { z } from 'zod';

export const API_KEY_SCOPES = ['read', 'write', 'update', 'delete'] as const;

export const ApiKeyScopeSchema = z.enum(API_KEY_SCOPES);

export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>;
