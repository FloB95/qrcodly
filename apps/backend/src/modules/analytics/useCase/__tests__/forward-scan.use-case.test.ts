import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTrackScanDto } from '@shared/schemas';
import { type KeyCache } from '@/core/cache';
import { type UmamiAnalyticsService } from '../../service/umami-analytics.service';
import { type DispatchTrackingEventUseCase } from '../dispatch-tracking-event.use-case';
import { ForwardScanUseCase } from '../forward-scan.use-case';

describe('ForwardScanUseCase', () => {
	let keyCache: MockProxy<KeyCache>;
	let umami: MockProxy<UmamiAnalyticsService>;
	let dispatch: MockProxy<DispatchTrackingEventUseCase>;
	let useCase: ForwardScanUseCase;

	const scan: TTrackScanDto = {
		url: 'https://example.com/u/abc12',
		userAgent: 'Mozilla/5.0',
		hostname: 'example.com',
		language: 'en-US',
		referrer: 'https://referrer.example',
		ip: '203.0.113.42',
		deviceType: 'mobile',
		browserName: 'Chrome',
	};

	beforeEach(() => {
		keyCache = mock<KeyCache>();
		umami = mock<UmamiAnalyticsService>();
		dispatch = mock<DispatchTrackingEventUseCase>();
		useCase = new ForwardScanUseCase(keyCache, umami, dispatch);
	});

	it('clears the views cache and sends the scan to Umami', () => {
		useCase.execute('abc12', 'user-1', scan);

		expect(keyCache.del).toHaveBeenCalledWith('views:abc12');
		expect(umami.sendEvent).toHaveBeenCalledTimes(1);
		expect(umami.sendEvent).toHaveBeenCalledWith({
			url: scan.url,
			userAgent: scan.userAgent,
			hostname: scan.hostname,
			language: scan.language,
			referrer: scan.referrer,
			deviceType: scan.deviceType,
			ip: scan.ip,
		});
	});

	it("hands the scan to the owner's integrations", () => {
		useCase.execute('abc12', 'user-1', scan);

		expect(dispatch.execute).toHaveBeenCalledTimes(1);
		expect(dispatch.execute).toHaveBeenCalledWith({ userId: 'user-1', ...scan });
	});

	it('counts a scan without owner in Umami only', () => {
		useCase.execute('zzzzz', null, scan);

		expect(keyCache.del).toHaveBeenCalledWith('views:zzzzz');
		expect(umami.sendEvent).toHaveBeenCalledTimes(1);
		expect(dispatch.execute).not.toHaveBeenCalled();
	});
});
