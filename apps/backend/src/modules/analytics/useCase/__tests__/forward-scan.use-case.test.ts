import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTrackScanDto } from '@shared/schemas';
import { type KeyCache } from '@/core/cache';
import { scansExcluded } from '@/core/metrics';
import { type UmamiAnalyticsService } from '../../service/umami-analytics.service';
import { type ScanIpExclusionMatcherService } from '../../service/scan-ip-exclusion-matcher.service';
import { type DispatchTrackingEventUseCase } from '../dispatch-tracking-event.use-case';
import { ForwardScanUseCase } from '../forward-scan.use-case';

describe('ForwardScanUseCase', () => {
	let keyCache: MockProxy<KeyCache>;
	let umami: MockProxy<UmamiAnalyticsService>;
	let dispatch: MockProxy<DispatchTrackingEventUseCase>;
	let matcher: MockProxy<ScanIpExclusionMatcherService>;
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
		matcher = mock<ScanIpExclusionMatcherService>();
		matcher.isExcluded.mockResolvedValue(false);
		useCase = new ForwardScanUseCase(keyCache, umami, dispatch, matcher);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('clears the views cache and sends the scan to Umami', async () => {
		await useCase.execute('abc12', 'user-1', scan);

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

	it("hands the scan to the owner's integrations", async () => {
		await useCase.execute('abc12', 'user-1', scan);

		expect(matcher.isExcluded).toHaveBeenCalledWith('user-1', scan.ip);
		expect(dispatch.execute).toHaveBeenCalledTimes(1);
		expect(dispatch.execute).toHaveBeenCalledWith({ userId: 'user-1', ...scan });
	});

	it('counts a scan without owner in Umami only, without an exclusion check', async () => {
		await useCase.execute('zzzzz', null, scan);

		expect(matcher.isExcluded).not.toHaveBeenCalled();
		expect(keyCache.del).toHaveBeenCalledWith('views:zzzzz');
		expect(umami.sendEvent).toHaveBeenCalledTimes(1);
		expect(dispatch.execute).not.toHaveBeenCalled();
	});

	it("drops a scan from the owner's excluded IP range everywhere", async () => {
		const excludedCounter = jest.spyOn(scansExcluded, 'add');
		matcher.isExcluded.mockResolvedValue(true);

		await useCase.execute('abc12', 'user-1', scan);

		expect(keyCache.del).not.toHaveBeenCalled();
		expect(umami.sendEvent).not.toHaveBeenCalled();
		expect(dispatch.execute).not.toHaveBeenCalled();
		expect(excludedCounter).toHaveBeenCalledWith(1);
	});

	it('does not count a forwarded scan as excluded', async () => {
		const excludedCounter = jest.spyOn(scansExcluded, 'add');

		await useCase.execute('abc12', 'user-1', scan);

		expect(excludedCounter).not.toHaveBeenCalled();
	});
});
