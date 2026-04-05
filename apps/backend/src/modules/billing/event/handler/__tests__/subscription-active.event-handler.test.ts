import 'reflect-metadata';
import { SubscriptionActiveEventHandler } from '../subscription-active.event-handler';
import { SubscriptionActiveEvent } from '@/core/event/subscription-active.event';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { type Mailer } from '@/core/mailer/mailer';
import { type EnableProFeaturesUseCase } from '../../../useCase/enable-pro-features.use-case';
import type UserSubscriptionRepository from '../../../domain/repository/user-subscription.repository';
import { type TUserSubscription } from '../../../domain/entities/user-subscription.entity';
import { container } from 'tsyringe';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

describe('SubscriptionActiveEventHandler', () => {
	let handler: SubscriptionActiveEventHandler;
	let mockLogger: MockProxy<Logger>;
	let mockMailer: MockProxy<Mailer>;
	let mockEnableProFeatures: MockProxy<EnableProFeaturesUseCase>;
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
		mockEnableProFeatures = mock<EnableProFeaturesUseCase>();
		mockRepository = mock<UserSubscriptionRepository>();

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'Logger':
					return mockLogger;
				case 'Mailer':
					return mockMailer;
				case 'EnableProFeaturesUseCase':
					return mockEnableProFeatures;
				case 'UserSubscriptionRepository':
					return mockRepository;
				default:
					return {};
			}
		});

		handler = new SubscriptionActiveEventHandler();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return early and log error when userId is missing', async () => {
		const event = new SubscriptionActiveEvent({ ...baseEventData, userId: '' });

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'error:subscription.active.missingUserId',
			expect.anything(),
		);
		expect(mockEnableProFeatures.execute).not.toHaveBeenCalled();
	});

	it('should enable pro features for user', async () => {
		mockRepository.findByUserId.mockResolvedValue(null as unknown as TUserSubscription);
		const event = new SubscriptionActiveEvent(baseEventData);

		await handler.handle(event);

		expect(mockEnableProFeatures.execute).toHaveBeenCalledWith('user-123');
	});

	it('should send reactivation email when user was in grace period', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			gracePeriodEndsAt: new Date('2026-04-15'),
		} as TUserSubscription);
		mockMailer.getTemplate.mockResolvedValue(jest.fn().mockReturnValue('<html>email</html>'));
		const event = new SubscriptionActiveEvent(baseEventData);

		await handler.handle(event);

		expect(mockMailer.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'test@example.com',
				subject: 'Welcome Back! Your QRcodly Subscription is Active',
			}),
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			'subscription.reactivatedEmailSent',
			expect.anything(),
		);
	});

	it('should not send reactivation email when user was not in grace period', async () => {
		mockRepository.findByUserId.mockResolvedValue({
			gracePeriodEndsAt: null,
		} as unknown as TUserSubscription);
		const event = new SubscriptionActiveEvent(baseEventData);

		await handler.handle(event);

		expect(mockMailer.sendMail).not.toHaveBeenCalled();
	});

	it('should log error when handler fails', async () => {
		mockRepository.findByUserId.mockRejectedValue(new Error('DB error'));
		const event = new SubscriptionActiveEvent(baseEventData);

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'subscription.activeHandlerFailed',
			expect.objectContaining({
				error: expect.any(Error),
			}),
		);
	});
});
