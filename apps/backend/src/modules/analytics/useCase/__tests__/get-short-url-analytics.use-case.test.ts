import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TAnalyticsResponseDto } from '@shared/schemas';
import { PlanName } from '@/core/config/plan.config';
import { type UmamiAnalyticsService } from '../../service/umami-analytics.service';
import { GetShortUrlAnalyticsUseCase } from '../get-short-url-analytics.use-case';

describe('GetShortUrlAnalyticsUseCase', () => {
	let umami: MockProxy<UmamiAnalyticsService>;
	let useCase: GetShortUrlAnalyticsUseCase;
	const analytics = { detailsLocked: false } as TAnalyticsResponseDto;

	beforeEach(() => {
		umami = mock<UmamiAnalyticsService>();
		umami.getAnalyticsForEndpoint.mockResolvedValue(analytics);
		useCase = new GetShortUrlAnalyticsUseCase(umami);
	});

	it('asks Umami for the scan path of the short URL with details for Pro', async () => {
		await expect(useCase.execute('abc12', PlanName.PRO)).resolves.toBe(analytics);

		expect(umami.getAnalyticsForEndpoint).toHaveBeenCalledWith('/u/abc12', {
			includeDetails: true,
		});
	});

	it('leaves the details out for Free', async () => {
		await useCase.execute('abc12', PlanName.FREE);

		expect(umami.getAnalyticsForEndpoint).toHaveBeenCalledWith('/u/abc12', {
			includeDetails: false,
		});
	});
});
