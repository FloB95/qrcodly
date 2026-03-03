import { z } from 'zod';
import { ProviderTypeSchema } from '../types/provider-type';

export const GoogleAnalyticsCredentialsSchema = z.object({
	measurementId: z.string().min(1, 'Measurement ID is required').regex(/^G-/, 'Must start with G-'),
	apiSecret: z.string().min(1, 'API Secret is required'),
});

export const MatomoCredentialsSchema = z.object({
	matomoUrl: z.string().url('Must be a valid URL'),
	siteId: z.string().min(1, 'Site ID is required'),
	authToken: z.string().optional(),
});

export const AnalyticsCredentialsSchema = z.union([
	GoogleAnalyticsCredentialsSchema,
	MatomoCredentialsSchema,
]);

export const CreateAnalyticsIntegrationDto = z.object({
	providerType: ProviderTypeSchema,
	credentials: z.record(z.string(), z.unknown()),
});

export type TCreateAnalyticsIntegrationDto = z.infer<typeof CreateAnalyticsIntegrationDto>;
export type TGoogleAnalyticsCredentials = z.infer<typeof GoogleAnalyticsCredentialsSchema>;
export type TMatomoCredentials = z.infer<typeof MatomoCredentialsSchema>;
