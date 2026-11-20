import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { type TTrackScanDto } from '@shared/schemas';
import { KeyCache } from '@/core/cache';
import { UmamiAnalyticsService } from '../service/umami-analytics.service';
import { DispatchTrackingEventUseCase } from './dispatch-tracking-event.use-case';
import { SHORT_URL_VIEWS_CACHE_KEY_PREFIX } from '../config/constants';

/** The one place that decides where a scan is counted. */
@injectable()
export class ForwardScanUseCase implements IBaseUseCase {
	constructor(
		@inject(KeyCache) private readonly keyCache: KeyCache,
		@inject(UmamiAnalyticsService) private readonly umamiAnalyticsService: UmamiAnalyticsService,
		@inject(DispatchTrackingEventUseCase)
		private readonly dispatchTrackingEventUseCase: DispatchTrackingEventUseCase,
	) {}

	execute(shortCode: string, ownerId: string | null, scan: TTrackScanDto): void {
		void this.keyCache.del(`${SHORT_URL_VIEWS_CACHE_KEY_PREFIX}${shortCode}`);

		void this.umamiAnalyticsService.sendEvent({
			url: scan.url,
			userAgent: scan.userAgent,
			hostname: scan.hostname,
			language: scan.language,
			referrer: scan.referrer,
			deviceType: scan.deviceType,
			ip: scan.ip,
		});

		if (ownerId) {
			this.dispatchTrackingEventUseCase.execute({
				userId: ownerId,
				url: scan.url,
				userAgent: scan.userAgent,
				hostname: scan.hostname,
				language: scan.language,
				referrer: scan.referrer,
				ip: scan.ip,
				deviceType: scan.deviceType,
				browserName: scan.browserName,
			});
		}
	}
}
