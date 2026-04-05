import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { type Mailer } from '@/core/mailer/mailer';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import { type DisableProFeaturesUseCase } from '../../useCase/disable-pro-features.use-case';
import { type TUserSubscription } from '../../domain/entities/user-subscription.entity';
import { container } from 'tsyringe';

jest.mock('@/core/decorators/cron-job.decorator', () => ({
	CronJob: () => () => {},
}));

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

// Import after mocks are set up
import { ProcessExpiredGracePeriodsCronJob } from '../process-expired-grace-periods.cron-job';

jest.mock('@clerk/fastify', () => ({
	createClerkClient: jest.fn().mockReturnValue({
		users: {
			getUser: jest.fn().mockResolvedValue({
				emailAddresses: [{ emailAddress: 'user@example.com' }],
				firstName: 'Jane',
			}),
		},
	}),
}));

describe('ProcessExpiredGracePeriodsCronJob', () => {
	let job: ProcessExpiredGracePeriodsCronJob;
	let mockLogger: MockProxy<Logger>;
	let mockMailer: MockProxy<Mailer>;
	let mockRepository: MockProxy<UserSubscriptionRepository>;
	let mockDisableProFeatures: MockProxy<DisableProFeaturesUseCase>;

	const mockSubscription = {
		userId: 'user-123',
	} as TUserSubscription;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockMailer = mock<Mailer>();
		mockRepository = mock<UserSubscriptionRepository>();
		mockDisableProFeatures = mock<DisableProFeaturesUseCase>();

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'Logger':
					return mockLogger;
				case 'UserSubscriptionRepository':
					return mockRepository;
				case 'DisableProFeaturesUseCase':
					return mockDisableProFeatures;
				case 'Mailer':
					return mockMailer;
				default:
					return {};
			}
		});

		job = new ProcessExpiredGracePeriodsCronJob();
		(job as unknown as { logger: Logger }).logger = mockLogger;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should do nothing when no expired grace periods exist', async () => {
		mockRepository.findExpiredUnprocessedGracePeriods.mockResolvedValue([]);

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockLogger.debug).toHaveBeenCalledWith('No expired grace periods to process');
		expect(mockDisableProFeatures.execute).not.toHaveBeenCalled();
	});

	it('should disable pro features and send notification email', async () => {
		mockRepository.findExpiredUnprocessedGracePeriods.mockResolvedValue([mockSubscription]);
		mockMailer.getTemplate.mockResolvedValue(jest.fn().mockReturnValue('<html>disabled</html>'));

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockDisableProFeatures.execute).toHaveBeenCalledWith('user-123');
		expect(mockMailer.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'user@example.com',
				subject: 'Your QRcodly Pro Features Have Been Disabled',
			}),
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			'subscription.gracePeriodExpired',
			expect.objectContaining({
				subscription: { userId: 'user-123' },
			}),
		);
	});

	it('should still disable features when user has no email', async () => {
		mockRepository.findExpiredUnprocessedGracePeriods.mockResolvedValue([mockSubscription]);

		const { createClerkClient } = jest.requireMock('@clerk/fastify');
		createClerkClient.mockReturnValue({
			users: {
				getUser: jest.fn().mockResolvedValue({
					emailAddresses: [],
					firstName: null,
				}),
			},
		});

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockDisableProFeatures.execute).toHaveBeenCalledWith('user-123');
		expect(mockMailer.sendMail).not.toHaveBeenCalled();
	});

	it('should log error and continue when processing a subscription fails', async () => {
		mockRepository.findExpiredUnprocessedGracePeriods.mockResolvedValue([mockSubscription]);
		mockDisableProFeatures.execute.mockRejectedValue(new Error('Disable failed'));

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockLogger.error).toHaveBeenCalledWith(
			'subscription.gracePeriodProcessingFailed',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
