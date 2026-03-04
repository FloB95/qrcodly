import { z } from 'zod';
import { AbstractEntitySchema } from '../../../schemas/AbstractEntitySchema';
import { ProviderTypeSchema } from '../types/provider-type';

export const AnalyticsIntegrationResponseDto = AbstractEntitySchema.extend({
	providerType: ProviderTypeSchema,
	isEnabled: z.boolean(),
	hasCredentials: z.boolean(),
	hasAuthToken: z.boolean(),
	displayIdentifier: z.string().nullable(),
	lastError: z.string().nullable().optional(),
	lastErrorAt: z.coerce.date().nullable().optional(),
	consecutiveFailures: z.number(),
	createdBy: z.string(),
});

export type TAnalyticsIntegrationResponseDto = z.infer<typeof AnalyticsIntegrationResponseDto>;

export const AnalyticsIntegrationListResponseDto = z.array(AnalyticsIntegrationResponseDto);

export type TAnalyticsIntegrationListResponseDto = z.infer<
	typeof AnalyticsIntegrationListResponseDto
>;
