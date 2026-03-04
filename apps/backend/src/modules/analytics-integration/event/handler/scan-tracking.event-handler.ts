import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { ScanTrackingEvent } from '../scan-tracking.event';
import AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import { CredentialEncryptionService } from '../../service/credential-encryption.service';
import { AnalyticsProviderRegistry } from '../../service/providers/analytics-provider.registry';
import { MAX_CONSECUTIVE_FAILURES } from '../../config/constants';
import { type IScanEventData } from '../../service/providers/analytics-provider.interface';

@EventHandler(ScanTrackingEvent.eventName)
export class ScanTrackingEventHandler extends AbstractEventHandler<ScanTrackingEvent> {
	constructor() {
		super();
	}

	async handle(event: ScanTrackingEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const repository = container.resolve(AnalyticsIntegrationRepository);
		const encryption = container.resolve(CredentialEncryptionService);
		const providerRegistry = container.resolve(AnalyticsProviderRegistry);

		let integrations;
		try {
			integrations = await repository.findEnabledByUserId(event.data.userId);
		} catch (error) {
			logger.error('analyticsIntegration.fetch.failed', {
				analyticsIntegration: { userId: event.data.userId },
				error,
			});
			return;
		}

		if (integrations.length === 0) return;

		const results = await Promise.allSettled(
			integrations.map(async (integration) => {
				try {
					const credentials = encryption.decrypt(
						integration.encryptedCredentials,
						integration.encryptionIv,
						integration.encryptionTag,
					);

					const eventData: IScanEventData = {
						url: event.data.url,
						userAgent: event.data.userAgent,
						hostname: event.data.hostname,
						language: event.data.language,
						referrer: event.data.referrer,
						ip: event.data.ip,
						deviceType: event.data.deviceType,
						browserName: event.data.browserName,
					};

					const provider = providerRegistry.getProvider(integration.providerType);
					await provider.sendEvent(eventData, credentials);

					// Reset failure counter on success
					if (integration.consecutiveFailures > 0) {
						await repository.update(integration, {
							consecutiveFailures: 0,
							lastError: null,
							lastErrorAt: null,
						});
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';

					await repository.recordFailure(integration.id, errorMessage, MAX_CONSECUTIVE_FAILURES);

					logger.error('analyticsIntegration.dispatch.failed', {
						analyticsIntegration: {
							id: integration.id,
							providerType: integration.providerType,
							previousFailures: integration.consecutiveFailures,
						},
						error: errorMessage,
					});
					throw error;
				}
			}),
		);

		const failed = results.filter((r) => r.status === 'rejected').length;
		if (failed > 0) {
			logger.warn('analyticsIntegration.dispatch.partialFailure', {
				analyticsIntegration: {
					userId: event.data.userId,
					total: integrations.length,
					failed,
				},
			});
		}
	}
}
