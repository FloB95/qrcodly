import 'reflect-metadata';
import { SubscriptionPastDueEventHandler } from '../subscription-past-due.event-handler';
import { SubscriptionPastDueEvent } from '@/core/event/subscription-past-due.event';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { type Mailer } from '@/core/mailer/mailer';
import type UserSubscriptionRepository from '../../../domain/repository/user-subscription.repository';
import { type TUserSubscription } from '../../../domain/entities/user-subscription.entity';
import { container } from 'tsyringe';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

describe('SubscriptionPastDueEventHandler', () => {
	let handler: SubscriptionPastDueEventHandler;
	let mockLogger: MockProxy<Logger>;
	let mockMailer: MockProxy<Mailer>;
	let mockRepository: MockProxy<UserSubscriptionRepository>;

	const baseEventData = {
		userId: 'user-123',
		email: 'test@example.com',
		firstName: 'John',
		stripeSubscriptionId: 'sub_123',
		stripePriceId: 'price_123',
		currentPeriodEnd: new Date('2026-05-01'),
	};

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockMailer = mock<Mailer>();
		mockRepository = mock<UserSubscriptionRepository>();

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'Logger':
					return mockLogger;
				case 'Mailer':
					return mockMailer;
				case 'UserSubscriptionRepository':
					return mockRepository;
				default:
					return {};
			}
		});

		handler = new SubscriptionPastDueEventHandler();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return early and log error when userId is missing', async () => {
		const event = new SubscriptionPastDueEvent({ ...baseEventData, userId: '' });

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'error:subscription.pastDue.missingUserId',
			expect.anything(),
		);
		expect(mockRepository.findByUserId).not.toHaveBeenCalled();
	});

	it('should skip if already notified (idempotency)', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			pastDueNotifiedAt: new Date(),
		} as TUserSubscription);
		const event = new SubscriptionPastDueEvent(baseEventData);

		await handler.handle(event);

		expect(mockLogger.info).toHaveBeenCalledWith(
			'subscription.pastDue.alreadyNotified',
			expect.anything(),
		);
		expect(mockMailer.sendMail).not.toHaveBeenCalled();
	});

	it('should send past due email and mark as notified', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			pastDueNotifiedAt: null,
		} as unknown as TUserSubscription);
		mockMailer.getTemplate.mockResolvedValue(jest.fn().mockReturnValue('<html>email</html>'));
		const event = new SubscriptionPastDueEvent(baseEventData);

		await handler.handle(event);

		expect(mockMailer.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'test@example.com',
				subject: 'Action Required: Your QRcodly Payment is Past Due',
			}),
		);
		expect(mockRepository.markPastDueNotified).toHaveBeenCalledWith('user-123');
		expect(mockLogger.info).toHaveBeenCalledWith(
			'subscription.pastDueEmailSent',
			expect.anything(),
		);
	});

	it('should log error when handler fails', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			pastDueNotifiedAt: null,
		} as unknown as TUserSubscription);
		mockMailer.getTemplate.mockRejectedValue(new Error('Mail error'));
		const event = new SubscriptionPastDueEvent(baseEventData);

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'subscription.pastDueEmailFailed',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
