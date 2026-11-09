import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import { type VerifyCustomDomainUseCase } from '../../useCase/verify-custom-domain.use-case';
import type { TCustomDomain } from '../../domain/entities/custom-domain.entity';
import { container } from 'tsyringe';

jest.mock('@/core/decorators/cron-job.decorator', () => ({
	CronJob: () => () => {},
}));

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

// Import after mocks are set up
import { VerifyPendingCustomDomainsCronJob } from '../verify-pending-custom-domains.cron-job';

const makeDomain = (overrides: Partial<TCustomDomain> = {}): TCustomDomain =>
	({
		id: 'domain-1',
		domain: 'qr.example.com',
		sslStatus: 'initializing',
		verificationPhase: 'dns_verification',
		...overrides,
	}) as TCustomDomain;

describe('VerifyPendingCustomDomainsCronJob', () => {
	let job: VerifyPendingCustomDomainsCronJob;
	let mockLogger: MockProxy<Logger>;
	let mockDomainRepository: MockProxy<CustomDomainRepository>;
	let mockVerify: MockProxy<VerifyCustomDomainUseCase>;

	const run = () => (job as unknown as { execute: () => Promise<void> }).execute();

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockDomainRepository = mock<CustomDomainRepository>();
		mockVerify = mock<VerifyCustomDomainUseCase>();

		(container.resolve as jest.Mock).mockImplementation((token: { name: string }) => {
			switch (token.name) {
				case 'CustomDomainRepository':
					return mockDomainRepository;
				case 'VerifyCustomDomainUseCase':
					return mockVerify;
				default:
					return mock();
			}
		});

		job = new VerifyPendingCustomDomainsCronJob();
		(job as unknown as { logger: Logger }).logger = mockLogger;

		mockDomainRepository.findPendingVerification.mockResolvedValue([]);
		mockVerify.execute.mockImplementation((domain) => Promise.resolve(domain));
	});

	afterEach(() => jest.clearAllMocks());

	it('should verify every pending domain', async () => {
		const a = makeDomain({ id: 'a', domain: 'a.example.com' });
		const b = makeDomain({ id: 'b', domain: 'b.example.com' });
		mockDomainRepository.findPendingVerification.mockResolvedValue([a, b]);

		await run();

		expect(mockVerify.execute).toHaveBeenCalledTimes(2);
		expect(mockVerify.execute).toHaveBeenCalledWith(a);
		expect(mockVerify.execute).toHaveBeenCalledWith(b);
	});

	it('should only look at domains created within the last week', async () => {
		const before = Date.now();

		await run();

		const [createdAfter] = mockDomainRepository.findPendingVerification.mock.calls[0];
		const expected = before - 7 * 24 * 60 * 60 * 1000;
		expect(Math.abs(createdAfter.getTime() - expected)).toBeLessThan(5000);
	});

	it('should count domains that became active', async () => {
		mockDomainRepository.findPendingVerification.mockResolvedValue([
			makeDomain({ id: 'a' }),
			makeDomain({ id: 'b' }),
		]);
		mockVerify.execute
			.mockResolvedValueOnce(makeDomain({ id: 'a', sslStatus: 'active' }))
			.mockResolvedValueOnce(makeDomain({ id: 'b', sslStatus: 'pending_validation' }));

		await run();

		expect(mockLogger.info).toHaveBeenCalledWith('customDomain.verificationSweep.complete', {
			customDomain: { checked: 2, activated: 1, errors: 0 },
		});
	});

	it('should keep going when one domain fails', async () => {
		const a = makeDomain({ id: 'a', domain: 'a.example.com' });
		const b = makeDomain({ id: 'b', domain: 'b.example.com' });
		mockDomainRepository.findPendingVerification.mockResolvedValue([a, b]);
		mockVerify.execute.mockRejectedValueOnce(new Error('cloudflare down')).mockResolvedValueOnce(b);

		await run();

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'customDomain.verificationSweep.error',
			expect.objectContaining({ customDomain: { id: 'a', domain: 'a.example.com' } }),
		);
		expect(mockVerify.execute).toHaveBeenCalledWith(b);
		expect(mockLogger.info).toHaveBeenCalledWith('customDomain.verificationSweep.complete', {
			customDomain: { checked: 2, activated: 0, errors: 1 },
		});
	});

	it('should do nothing when no domain is pending', async () => {
		await run();

		expect(mockVerify.execute).not.toHaveBeenCalled();
	});
});
