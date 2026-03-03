import { z } from 'zod';

export const ProviderTypeSchema = z.enum(['google_analytics', 'matomo']);
export type TProviderType = z.infer<typeof ProviderTypeSchema>;
