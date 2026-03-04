import { z } from 'zod';
import { AnalyticsCredentialsSchema } from './create-analytics-integration.dto';

export const UpdateAnalyticsIntegrationDto = z.object({
	credentials: z
		.record(z.string(), z.unknown())
		.optional()
		.refine(
			(creds) => {
				if (!creds) return true;
				return AnalyticsCredentialsSchema.safeParse(creds).success;
			},
			{ message: 'Invalid credentials format' },
		),
	isEnabled: z.boolean().optional(),
});

export type TUpdateAnalyticsIntegrationDto = z.infer<typeof UpdateAnalyticsIntegrationDto>;
