import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type KeyCache } from '@/core/cache';
import { type UmamiAnalyticsService } from '../../service/umami-analytics.service';
import { GetShortUrlViewsUseCase } from '../get-short-url-views.use-case';

describe('GetShortUrlViewsUseCase', () => {
	let keyCache: MockProxy<KeyCache>;
	let umami: MockProxy<UmamiAnalyticsService>;
	let useCase: GetShortUrlViewsUseCase;

	beforeEach(() => {
		keyCache = mock<KeyCache>();
		umami = mock<UmamiAnalyticsService>();
		useCase = new GetShortUrlViewsUseCase(keyCache, umami);
	});

	it('answers from the cache without asking Umami', async () => {
		keyCache.get.mockResolvedValue('42');

		await expect(useCase.execute('abc12')).resolves.toBe(42);

		expect(keyCache.get).toHaveBeenCalledWith('views:abc12');
		expect(umami.getViewsForEndpoint).not.toHaveBeenCalled();
	});

	it('asks Umami on a miss and caches the result for an hour', async () => {
		keyCache.get.mockResolvedValue(null);
		umami.getViewsForEndpoint.mockResolvedValue(17);

		await expect(useCase.execute('abc12')).resolves.toBe(17);

		expect(umami.getViewsForEndpoint).toHaveBeenCalledWith('/u/abc12');
		expect(keyCache.set).toHaveBeenCalledWith('views:abc12', 17, 3600);
	});

	it('returns a cached zero instead of asking Umami again', async () => {
		keyCache.get.mockResolvedValue('0');

		await expect(useCase.execute('abc12')).resolves.toBe(0);

		expect(umami.getViewsForEndpoint).not.toHaveBeenCalled();
	});
});
