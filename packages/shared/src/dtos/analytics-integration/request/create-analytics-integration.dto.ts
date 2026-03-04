import { z } from 'zod';
import { ProviderTypeSchema } from '../types/provider-type';

export const GoogleAnalyticsCredentialsSchema = z.object({
	measurementId: z.string().min(1, 'Measurement ID is required').regex(/^G-/, 'Must start with G-'),
	apiSecret: z.string().min(1, 'API Secret is required'),
});

export const MatomoCredentialsSchema = z.object({
	matomoUrl: z
		.string()
		.url('Must be a valid URL')
		.regex(/^https?:\/\//, 'Must start with http:// or https://'),
	siteId: z.string().min(1, 'Site ID is required'),
	authToken: z.string().optional(),
});

export const AnalyticsCredentialsSchema = z.union([
	GoogleAnalyticsCredentialsSchema,
	MatomoCredentialsSchema,
]);

const BaseCreateAnalyticsIntegrationDto = z.object({
	providerType: ProviderTypeSchema,
	credentials: z.record(z.string(), z.unknown()),
});

export const CreateAnalyticsIntegrationDto = BaseCreateAnalyticsIntegrationDto.superRefine(
	(data, ctx) => {
		const schema =
			data.providerType === 'google_analytics'
				? GoogleAnalyticsCredentialsSchema
				: MatomoCredentialsSchema;

		const result = schema.safeParse(data.credentials);
		if (!result.success) {
			for (const issue of result.error.issues) {
				ctx.addIssue({
					...issue,
					path: ['credentials', ...issue.path],
				});
			}
		}
	},
);

export type TCreateAnalyticsIntegrationDto = z.infer<typeof BaseCreateAnalyticsIntegrationDto>;
export type TGoogleAnalyticsCredentials = z.infer<typeof GoogleAnalyticsCredentialsSchema>;
export type TMatomoCredentials = z.infer<typeof MatomoCredentialsSchema>;
