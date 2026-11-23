import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { Logger } from '@/core/logging';
import AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import ScanIpExclusionRepository from '../../domain/repository/scan-ip-exclusion.repository';
import { ScanIpExclusionMatcherService } from '../../service/scan-ip-exclusion-matcher.service';

@EventHandler(UserDeletedEvent.eventName)
export class DeleteAnalyticsDataOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;

		// Separate attempts, so one failed cleanup does not skip the other
		try {
			await container.resolve(AnalyticsIntegrationRepository).deleteAllByUserId(userId);
		} catch (error) {
			container.resolve(Logger).error('analytics.integration.user-cleanup.failed', {
				error: error as Error,
				userId,
			});
		}

		try {
			await container.resolve(ScanIpExclusionRepository).deleteAllByUserId(userId);
			await container.resolve(ScanIpExclusionMatcherService).invalidate(userId);
		} catch (error) {
			container.resolve(Logger).error('analytics.scan-ip-exclusion.user-cleanup.failed', {
				error: error as Error,
				userId,
			});
		}
	}
}
