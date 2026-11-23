import { singleton, inject } from 'tsyringe';
import { type TProviderType } from '../../domain/entities/analytics-integration.entity';
import { type IAnalyticsProvider } from './analytics-provider.interface';
import { GoogleAnalyticsProvider } from './google-analytics.provider';
import { MatomoProvider } from './matomo.provider';

@singleton()
export class AnalyticsProviderRegistry {
	private providers: Map<TProviderType, IAnalyticsProvider>;

	constructor(
		@inject(GoogleAnalyticsProvider) googleAnalytics: GoogleAnalyticsProvider,
		@inject(MatomoProvider) matomo: MatomoProvider,
	) {
		this.providers = new Map<TProviderType, IAnalyticsProvider>([
			['google_analytics', googleAnalytics],
			['matomo', matomo],
		]);
	}

	getProvider(providerType: TProviderType): IAnalyticsProvider {
		const provider = this.providers.get(providerType);
		if (!provider) {
			throw new Error(`Unknown analytics provider: ${providerType}`);
		}
		return provider;
	}
}
