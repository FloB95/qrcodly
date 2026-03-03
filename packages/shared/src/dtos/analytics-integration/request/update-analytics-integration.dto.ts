import { z } from 'zod';

export const UpdateAnalyticsIntegrationDto = z.object({
	credentials: z.record(z.string(), z.unknown()).optional(),
	isEnabled: z.boolean().optional(),
});

export type TUpdateAnalyticsIntegrationDto = z.infer<typeof UpdateAnalyticsIntegrationDto>;
