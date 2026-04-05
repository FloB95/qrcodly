import 'reflect-metadata';
import { SubscriptionCancelInitiatedEventHandler } from '../subscription-cancel-initiated.event-handler';
import { SubscriptionCancelInitiatedEvent } from '@/core/event/subscription-cancel-initiated.event';
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

describe('SubscriptionCancelInitiatedEventHandler', () => {
	let handler: SubscriptionCancelInitiatedEventHandler;
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

		handler = new SubscriptionCancelInitiatedEventHandler();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return early and log error when userId is missing', async () => {
		const event = new SubscriptionCancelInitiatedEvent({ ...baseEventData, userId: '' });

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'error:subscription.cancelInitiated.missingUserId',
			expect.anything(),
		);
		expect(mockRepository.findByUserId).not.toHaveBeenCalled();
	});

	it('should skip if already notified (idempotency)', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			cancellationNotifiedAt: new Date(),
		} as TUserSubscription);
		const event = new SubscriptionCancelInitiatedEvent(baseEventData);

		await handler.handle(event);

		expect(mockLogger.info).toHaveBeenCalledWith(
			'subscription.cancelInitiated.alreadyNotified',
			expect.anything(),
		);
		expect(mockMailer.sendMail).not.toHaveBeenCalled();
	});

	it('should send cancellation email and mark as notified', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			cancellationNotifiedAt: null,
		} as unknown as TUserSubscription);
		mockMailer.getTemplate.mockResolvedValue(jest.fn().mockReturnValue('<html>email</html>'));
		const event = new SubscriptionCancelInitiatedEvent(baseEventData);

		await handler.handle(event);

		expect(mockMailer.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'test@example.com',
				subject: "We're Sorry to See You Go - QRcodly Subscription",
			}),
		);
		expect(mockRepository.markCancellationNotified).toHaveBeenCalledWith('user-123');
		expect(mockLogger.info).toHaveBeenCalledWith(
			'subscription.cancelInitiatedEmailSent',
			expect.anything(),
		);
	});

	it('should use fallback name when firstName is not provided', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			cancellationNotifiedAt: null,
		} as unknown as TUserSubscription);
		const templateFn = jest.fn().mockReturnValue('<html>email</html>');
		mockMailer.getTemplate.mockResolvedValue(templateFn);
		const event = new SubscriptionCancelInitiatedEvent({
			...baseEventData,
			firstName: undefined,
		});

		await handler.handle(event);

		expect(templateFn).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'there' }));
	});

	it('should log error when email sending fails', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			cancellationNotifiedAt: null,
		} as unknown as TUserSubscription);
		mockMailer.getTemplate.mockRejectedValue(new Error('Template error'));
		const event = new SubscriptionCancelInitiatedEvent(baseEventData);

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'subscription.cancelInitiatedEmailFailed',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
