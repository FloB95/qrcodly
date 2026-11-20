import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import { UmamiAnalyticsService } from '../service/umami-analytics.service';
import {
	SHORT_URL_VIEWS_CACHE_KEY_PREFIX,
	SHORT_URL_VIEWS_CACHE_TTL_SECONDS,
} from '../config/constants';

@injectable()
export class GetShortUrlViewsUseCase implements IBaseUseCase {
	constructor(
		@inject(KeyCache) private readonly keyCache: KeyCache,
		@inject(UmamiAnalyticsService) private readonly umamiAnalyticsService: UmamiAnalyticsService,
	) {}

	async execute(shortCode: string): Promise<number> {
		const cacheKey = `${SHORT_URL_VIEWS_CACHE_KEY_PREFIX}${shortCode}`;
		const cached = await this.keyCache.get(cacheKey);
		if (cached !== null) {
			return Number(cached);
		}

		const views = await this.umamiAnalyticsService.getViewsForEndpoint(`/u/${shortCode}`);
		await this.keyCache.set(cacheKey, views, SHORT_URL_VIEWS_CACHE_TTL_SECONDS);
		return views;
	}
}
