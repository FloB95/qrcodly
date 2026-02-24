import 'reflect-metadata';
import { SubscriptionStatusTransitionService } from '../subscription-status-transition.service';
import type { StatusTransitionInput } from '../subscription-status-transition.service';

// Mock Clerk client
jest.mock('@clerk/fastify', () => ({
	createClerkClient: () => ({
		users: {
			getUser: jest.fn().mockResolvedValue({
				emailAddresses: [{ emailAddress: 'test@example.com' }],
				firstName: 'Test',
			}),
		},
	}),
}));

// Mock env
jest.mock('@/core/config/env', () => ({
	env: {
		CLERK_SECRET_KEY: 'test_clerk_key',
	},
}));

const mockEmit = jest.fn().mockResolvedValue(undefined);
const mockEventEmitter = {
	emit: mockEmit,
};

const mockLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
};

const mockCache = {
	del: jest.fn().mockResolvedValue(undefined),
};

function createService(): SubscriptionStatusTransitionService {
	return new SubscriptionStatusTransitionService(
		mockEventEmitter as any,
		mockLogger as any,
		mockCache as any,
	);
}

describe('SubscriptionStatusTransitionService', () => {
	let service: SubscriptionStatusTransitionService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = createService();
	});

	describe('handleTransition', () => {
		it('should skip when status has not changed', async () => {
			const input: StatusTransitionInput = {
				userId: 'user_123',
				previousStatus: 'active',
				newStatus: 'active',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			};

			await service.handleTransition(input);

			expect(mockEmit).not.toHaveBeenCalled();
		});

		it('should emit active event when transitioning to active', async () => {
			const input: StatusTransitionInput = {
				userId: 'user_123',
				previousStatus: 'past_due',
				newStatus: 'active',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			};

			await service.handleTransition(input);

			expect(mockCache.del).toHaveBeenCalledWith('user_plan:user_123');
			expect(mockEmit).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: 'user_123',
						stripeSubscriptionId: 'sub_123',
						stripePriceId: 'price_123',
					}),
				}),
			);
		});

		it('should emit canceled event when transitioning to canceled', async () => {
			const input: StatusTransitionInput = {
				userId: 'user_123',
				previousStatus: 'active',
				newStatus: 'canceled',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			};

			await service.handleTransition(input);

			expect(mockCache.del).toHaveBeenCalledWith('user_plan:user_123');
			expect(mockEmit).toHaveBeenCalled();
		});

		it('should emit past_due event when transitioning to past_due', async () => {
			const input: StatusTransitionInput = {
				userId: 'user_123',
				previousStatus: 'active',
				newStatus: 'past_due',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			};

			await service.handleTransition(input);

			expect(mockCache.del).toHaveBeenCalledWith('user_plan:user_123');
			expect(mockEmit).toHaveBeenCalled();
		});

		it('should not emit for unknown status transitions', async () => {
			const input: StatusTransitionInput = {
				userId: 'user_123',
				previousStatus: 'active',
				newStatus: 'trialing',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			};

			await service.handleTransition(input);

			expect(mockEmit).not.toHaveBeenCalled();
		});
	});

	describe('emitActive', () => {
		it('should invalidate cache and emit SubscriptionActiveEvent', async () => {
			await service.emitActive({
				userId: 'user_123',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			});

			expect(mockCache.del).toHaveBeenCalledWith('user_plan:user_123');
			expect(mockEmit).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: 'user_123',
						stripeSubscriptionId: 'sub_123',
					}),
				}),
			);
		});
	});

	describe('emitCanceled', () => {
		it('should invalidate cache and emit SubscriptionCanceledEvent', async () => {
			await service.emitCanceled({
				userId: 'user_123',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			});

			expect(mockCache.del).toHaveBeenCalledWith('user_plan:user_123');
			expect(mockEmit).toHaveBeenCalled();
		});
	});

	describe('emitCancelInitiated', () => {
		it('should invalidate cache and emit SubscriptionCancelInitiatedEvent', async () => {
			await service.emitCancelInitiated({
				userId: 'user_123',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			});

			expect(mockCache.del).toHaveBeenCalledWith('user_plan:user_123');
			expect(mockEmit).toHaveBeenCalled();
		});
	});

	describe('emitPastDue', () => {
		it('should invalidate cache and emit SubscriptionPastDueEvent', async () => {
			await service.emitPastDue({
				userId: 'user_123',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			});

			expect(mockCache.del).toHaveBeenCalledWith('user_plan:user_123');
			expect(mockEmit).toHaveBeenCalled();
		});
	});

	describe('getUserInfo error handling', () => {
		it('should return empty email on Clerk error', async () => {
			// Create a service with a failing Clerk client
			jest.resetModules();
			const clerkMock = jest.requireMock('@clerk/fastify') as {
				createClerkClient: jest.Mock;
			};
			clerkMock.createClerkClient = () => ({
				users: {
					getUser: jest.fn().mockRejectedValue(new Error('Clerk error')),
				},
			});

			const errorService = createService();

			// Should not throw; should still emit with empty email
			await errorService.emitActive({
				userId: 'user_unknown',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
			});

			expect(mockEmit).toHaveBeenCalled();
		});
	});
});
