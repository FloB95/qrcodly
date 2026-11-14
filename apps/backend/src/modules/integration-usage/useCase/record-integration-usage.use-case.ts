import { inject, injectable } from 'tsyringe';
import { type TApiClientInfo } from '@shared/schemas';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { KeyCache } from '@/core/cache';
import { Logger } from '@/core/logging';
import IntegrationUsageRepository from '../domain/repository/integration-usage.repository';

const RECORD_INTERVAL_SECONDS = 60 * 60;

/**
 * Runs on every authenticated request, so the database is written at most once per hour per user
 * and client. The version is client-supplied and deliberately not part of the throttle key, so
 * rotating it cannot force extra writes. Never throws: tracking must not break a request.
 */
@injectable()
export class RecordIntegrationUsageUseCase implements IBaseUseCase {
	constructor(
		@inject(IntegrationUsageRepository)
		private integrationUsageRepository: IntegrationUsageRepository,
		@inject(KeyCache) private cache: KeyCache,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(userId: string, apiClient: TApiClientInfo): Promise<void> {
		try {
			const key = `integration_usage:${userId}:${apiClient.client}`;
			const acquired = await this.cache
				.getClient()
				.set(key, 1, 'EX', RECORD_INTERVAL_SECONDS, 'NX');
			if (acquired !== 'OK') return;

			await this.integrationUsageRepository.upsert(userId, apiClient, new Date());
		} catch (error) {
			this.logger.warn('integration-usage.record.failed', {
				error: error as Error,
				userId,
				client: apiClient.client,
			});
		}
	}
}
