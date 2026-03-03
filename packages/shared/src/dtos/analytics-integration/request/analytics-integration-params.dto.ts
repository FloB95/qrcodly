import { z } from 'zod';

export const AnalyticsIntegrationIdParamsDto = z.object({
	id: z.string().uuid(),
});

export type TAnalyticsIntegrationIdParamsDto = z.infer<typeof AnalyticsIntegrationIdParamsDto>;
