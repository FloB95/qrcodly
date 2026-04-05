import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { type Mailer } from '@/core/mailer/mailer';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
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
import { CancellationReminderCronJob } from '../cancellation-reminder.cron-job';

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

describe('CancellationReminderCronJob', () => {
	let job: CancellationReminderCronJob;
	let mockLogger: MockProxy<Logger>;
	let mockMailer: MockProxy<Mailer>;
	let mockRepository: MockProxy<UserSubscriptionRepository>;

	const mockSubscription = {
		userId: 'user-123',
		currentPeriodEnd: new Date('2026-05-01'),
	} as TUserSubscription;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockMailer = mock<Mailer>();
		mockRepository = mock<UserSubscriptionRepository>();

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'Logger':
					return mockLogger;
				case 'UserSubscriptionRepository':
					return mockRepository;
				case 'Mailer':
					return mockMailer;
				default:
					return {};
			}
		});

		job = new CancellationReminderCronJob();
		(job as unknown as { logger: Logger }).logger = mockLogger;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should do nothing when no pending reminders exist', async () => {
		mockRepository.findPendingCancellationReminders.mockResolvedValue([]);

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockLogger.debug).toHaveBeenCalledWith('No cancellation reminders to send');
		expect(mockMailer.sendMail).not.toHaveBeenCalled();
	});

	it('should send reminder email and mark as sent', async () => {
		mockRepository.findPendingCancellationReminders.mockResolvedValue([mockSubscription]);
		mockMailer.getTemplate.mockResolvedValue(jest.fn().mockReturnValue('<html>reminder</html>'));

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockMailer.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'user@example.com',
				subject: 'Reminder: Your QRcodly Subscription Is Ending Soon',
			}),
		);
		expect(mockRepository.markCancellationReminderSent).toHaveBeenCalledWith('user-123');
	});

	it('should skip user without email address', async () => {
		mockRepository.findPendingCancellationReminders.mockResolvedValue([mockSubscription]);

		// Override clerk mock for this test
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

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'subscription.cancellationReminder.noEmail',
			expect.anything(),
		);
		expect(mockMailer.sendMail).not.toHaveBeenCalled();
	});

	it('should log error and continue when sending fails for a subscription', async () => {
		mockRepository.findPendingCancellationReminders.mockResolvedValue([mockSubscription]);

		// Restore clerk mock to return valid user data
		const { createClerkClient } = jest.requireMock('@clerk/fastify');
		createClerkClient.mockReturnValue({
			users: {
				getUser: jest.fn().mockResolvedValue({
					emailAddresses: [{ emailAddress: 'user@example.com' }],
					firstName: 'Jane',
				}),
			},
		});

		mockMailer.getTemplate.mockRejectedValue(new Error('Template error'));

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockLogger.error).toHaveBeenCalledWith(
			'subscription.cancellationReminderFailed',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
