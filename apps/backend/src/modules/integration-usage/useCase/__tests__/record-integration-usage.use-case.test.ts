import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type KeyCache } from '@/core/cache';
import { type Logger } from '@/core/logging';
import type IntegrationUsageRepository from '../../domain/repository/integration-usage.repository';
import { RecordIntegrationUsageUseCase } from '../record-integration-usage.use-case';

describe('RecordIntegrationUsageUseCase', () => {
	let useCase: RecordIntegrationUsageUseCase;
	let mockRepository: MockProxy<IntegrationUsageRepository>;
	let mockCache: MockProxy<KeyCache>;
	let mockLogger: MockProxy<Logger>;
	let redisSet: jest.Mock;

	const userId = 'user-123';

	beforeEach(() => {
		mockRepository = mock<IntegrationUsageRepository>();
		mockCache = mock<KeyCache>();
		mockLogger = mock<Logger>();
		redisSet = jest.fn().mockResolvedValue('OK');
		mockCache.getClient.mockReturnValue({ set: redisSet } as unknown as ReturnType<
			KeyCache['getClient']
		>);
		useCase = new RecordIntegrationUsageUseCase(mockRepository, mockCache, mockLogger);
	});

	it('upserts the usage once the hourly slot is acquired', async () => {
		await useCase.execute(userId, { client: 'figma', version: '0.1.0' });

		expect(redisSet).toHaveBeenCalledWith('integration_usage:user-123:figma', 1, 'EX', 3600, 'NX');
		expect(mockRepository.upsert).toHaveBeenCalledWith(
			userId,
			{ client: 'figma', version: '0.1.0' },
			expect.any(Date),
		);
	});

	it('skips the database while the slot is still taken', async () => {
		redisSet.mockResolvedValue(null);

		await useCase.execute(userId, { client: 'web', version: null });

		expect(redisSet).toHaveBeenCalledWith('integration_usage:user-123:web', 1, 'EX', 3600, 'NX');
		expect(mockRepository.upsert).not.toHaveBeenCalled();
	});

	it('throttles per user and client, not per version', async () => {
		await useCase.execute(userId, { client: 'figma', version: '0.1.0' });
		await useCase.execute(userId, { client: 'figma', version: '9.9.9' });

		expect(redisSet.mock.calls[0][0]).toBe(redisSet.mock.calls[1][0]);
	});

	it('logs instead of throwing when the database write fails', async () => {
		mockRepository.upsert.mockRejectedValue(new Error('db down'));

		await expect(
			useCase.execute(userId, { client: 'indesign', version: '0.2.0' }),
		).resolves.toBeUndefined();
		expect(mockLogger.warn).toHaveBeenCalledWith(
			'integration-usage.record.failed',
			expect.objectContaining({ userId, client: 'indesign' }),
		);
	});

	it('logs instead of throwing when Redis is unavailable', async () => {
		redisSet.mockRejectedValue(new Error('redis down'));

		await expect(
			useCase.execute(userId, { client: 'web', version: null }),
		).resolves.toBeUndefined();
		expect(mockRepository.upsert).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalled();
	});
});
