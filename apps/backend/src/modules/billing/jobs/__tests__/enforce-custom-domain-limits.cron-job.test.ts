import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import type CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { type EnforceCustomDomainLimitUseCase } from '../../useCase/enforce-custom-domain-limit.use-case';
import { container } from 'tsyringe';

jest.mock('@/core/decorators/cron-job.decorator', () => ({
	CronJob: () => () => {},
}));

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

// Import after mocks are set up
import { EnforceCustomDomainLimitsCronJob } from '../enforce-custom-domain-limits.cron-job';

describe('EnforceCustomDomainLimitsCronJob', () => {
	let job: EnforceCustomDomainLimitsCronJob;
	let mockLogger: MockProxy<Logger>;
	let mockDomainRepository: MockProxy<CustomDomainRepository>;
	let mockEnforce: MockProxy<EnforceCustomDomainLimitUseCase>;

	const run = () => (job as unknown as { execute: () => Promise<void> }).execute();

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockDomainRepository = mock<CustomDomainRepository>();
		mockEnforce = mock<EnforceCustomDomainLimitUseCase>();

		(container.resolve as jest.Mock).mockImplementation((token: { name: string }) => {
			switch (token.name) {
				case 'CustomDomainRepository':
					return mockDomainRepository;
				case 'EnforceCustomDomainLimitUseCase':
					return mockEnforce;
				default:
					return mock();
			}
		});

		job = new EnforceCustomDomainLimitsCronJob();
		(job as unknown as { logger: Logger }).logger = mockLogger;

		mockDomainRepository.findUserIdsWithDomains.mockResolvedValue([]);
		mockEnforce.execute.mockResolvedValue({ effectiveLimit: 1, enabled: [], disabled: [] });
	});

	afterEach(() => jest.clearAllMocks());

	it('should enforce the limit for every user that owns a domain', async () => {
		mockDomainRepository.findUserIdsWithDomains.mockResolvedValue(['user-1', 'user-2']);

		await run();

		expect(mockEnforce.execute).toHaveBeenCalledTimes(2);
		expect(mockEnforce.execute).toHaveBeenCalledWith('user-1');
		expect(mockEnforce.execute).toHaveBeenCalledWith('user-2');
	});

	it('should actually switch domains off, not just report them', async () => {
		// The whole point of the sweep: no dryRun, or entitlement drift would never be repaired.
		mockDomainRepository.findUserIdsWithDomains.mockResolvedValue(['user-1']);

		await run();

		expect(mockEnforce.execute).toHaveBeenCalledWith('user-1');
		expect(mockEnforce.execute).not.toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ dryRun: true }),
		);
	});

	it('should warn when a domain outlived its entitlement', async () => {
		mockDomainRepository.findUserIdsWithDomains.mockResolvedValue(['user-1']);
		mockEnforce.execute.mockResolvedValue({
			effectiveLimit: 1,
			enabled: [],
			disabled: ['b.example.com'],
		});

		await run();

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'customDomain.limitSweep.disabled',
			expect.objectContaining({
				customDomain: { userId: 'user-1', disabled: ['b.example.com'] },
			}),
		);
	});

	it('should keep going when one user fails', async () => {
		mockDomainRepository.findUserIdsWithDomains.mockResolvedValue(['user-1', 'user-2']);
		mockEnforce.execute
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({ effectiveLimit: 1, enabled: [], disabled: [] });

		await run();

		expect(mockLogger.error).toHaveBeenCalledWith(
			'customDomain.limitSweep.error',
			expect.objectContaining({ customDomain: { userId: 'user-1' } }),
		);
		expect(mockEnforce.execute).toHaveBeenCalledWith('user-2');
	});

	it('should do nothing when nobody owns a domain', async () => {
		await run();

		expect(mockEnforce.execute).not.toHaveBeenCalled();
	});
});
