import 'reflect-metadata';
import { SubscriptionCanceledEventHandler } from '../subscription-canceled.event-handler';
import { SubscriptionCanceledEvent } from '@/core/event/subscription-canceled.event';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import type UserSubscriptionRepository from '../../../domain/repository/user-subscription.repository';
import { type TUserSubscription } from '../../../domain/entities/user-subscription.entity';
import { container } from 'tsyringe';
import { GRACE_PERIOD_DAYS } from '@/core/config/constants';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

describe('SubscriptionCanceledEventHandler', () => {
	let handler: SubscriptionCanceledEventHandler;
	let mockLogger: MockProxy<Logger>;
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
		mockRepository = mock<UserSubscriptionRepository>();

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'Logger':
					return mockLogger;
				case 'UserSubscriptionRepository':
					return mockRepository;
				default:
					return {};
			}
		});

		handler = new SubscriptionCanceledEventHandler();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return early and log error when userId is missing', async () => {
		const event = new SubscriptionCanceledEvent({ ...baseEventData, userId: '' });

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'error:subscription.canceled.missingUserId',
			expect.anything(),
		);
		expect(mockRepository.findByUserId).not.toHaveBeenCalled();
	});

	it('should set grace period on subscription', async () => {
		const mockSubscription = { id: 'sub-1', userId: 'user-123' } as TUserSubscription;
		mockRepository.findByUserId.mockResolvedValue(mockSubscription);
		const event = new SubscriptionCanceledEvent(baseEventData);

		await handler.handle(event);

		const expectedGracePeriodEnd = new Date('2026-05-01');
		expectedGracePeriodEnd.setDate(expectedGracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

		expect(mockRepository.update).toHaveBeenCalledWith(mockSubscription, {
			gracePeriodEndsAt: expectedGracePeriodEnd,
		});
		expect(mockLogger.info).toHaveBeenCalledWith('subscription.gracePeriodSet', expect.anything());
	});

	it('should log error and return when subscription not found', async () => {
		mockRepository.findByUserId.mockResolvedValue(undefined);
		const event = new SubscriptionCanceledEvent(baseEventData);

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'error:subscription.canceled.notFound',
			expect.anything(),
		);
		expect(mockRepository.update).not.toHaveBeenCalled();
	});

	it('should log error when handler fails', async () => {
		mockRepository.findByUserId.mockRejectedValue(new Error('DB error'));
		const event = new SubscriptionCanceledEvent(baseEventData);

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'subscription.canceledHandlerFailed',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
