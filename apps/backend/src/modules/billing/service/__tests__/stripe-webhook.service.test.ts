import 'reflect-metadata';
import { StripeWebhookService } from '../stripe-webhook.service';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import type { StripeService } from '../stripe.service';
import type { SubscriptionStatusTransitionService } from '../subscription-status-transition.service';
import type Stripe from 'stripe';

// Mock Logger
const mockLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
};

// Mock Repository
const mockRepository = {
	findByUserId: jest.fn(),
	findByStripeSubscriptionId: jest.fn(),
	upsertByStripeSubscriptionId: jest.fn(),
	update: jest.fn(),
	clearCancellationNotifications: jest.fn(),
	generateId: jest.fn().mockReturnValue('generated-test-id'),
} as unknown as jest.Mocked<UserSubscriptionRepository>;

// Mock StripeService
const mockStripeService = {
	getSubscription: jest.fn(),
} as unknown as jest.Mocked<StripeService>;

// Mock TransitionService
const mockTransitionService = {
	handleTransition: jest.fn(),
	emitActive: jest.fn(),
	emitCanceled: jest.fn(),
	emitCancelInitiated: jest.fn(),
	emitPastDue: jest.fn(),
} as unknown as jest.Mocked<SubscriptionStatusTransitionService>;

// Mock KeyCache (for webhook event deduplication)
const mockCache = {
	getClient: jest.fn().mockReturnValue({
		set: jest.fn().mockResolvedValue('OK'),
	}),
	del: jest.fn(),
} as any;

const mockAddonRepository = {
	findByStripeSubscriptionId: jest.fn(),
	findByUserAndType: jest.fn(),
} as any;

// Defaults to Pro so the existing Pro cases below are unaffected; add-on cases override it.
const mockProductResolver = {
	resolveFromPriceId: jest.fn().mockReturnValue('pro'),
	resolveFromSubscription: jest.fn().mockResolvedValue('pro'),
} as any;

const mockDomainAddonWebhookService = {
	handleSubscriptionUpsert: jest.fn(),
	handleSubscriptionDeleted: jest.fn(),
	handlePaymentFailed: jest.fn(),
} as any;

const mockSyncAddonWithPro = {
	cancelAtPeriodEnd: jest.fn(),
	resume: jest.fn(),
} as any;

function createService(): StripeWebhookService {
	return new StripeWebhookService(
		mockLogger as any,
		mockRepository,
		mockAddonRepository,
		mockStripeService,
		mockTransitionService,
		mockProductResolver,
		mockDomainAddonWebhookService,
		mockSyncAddonWithPro,
		mockCache,
	);
}

function makeStripeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
	return {
		id: 'sub_test_123',
		customer: 'cus_test_123',
		status: 'active',
		items: {
			data: [
				{
					price: { id: 'price_monthly' },
					current_period_start: Math.floor(Date.now() / 1000),
					current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
				},
			],
		} as any,
		cancel_at_period_end: false,
		metadata: { clerkUserId: 'user_test_123' },
		...overrides,
	} as Stripe.Subscription;
}

describe('StripeWebhookService', () => {
	let service: StripeWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// clearAllMocks leaves queued `...Once` implementations in place, so reset the default
		// explicitly — otherwise an unconsumed stub leaks into the next test.
		mockProductResolver.resolveFromSubscription.mockReset().mockResolvedValue('pro');
		service = createService();
	});

	describe('handleWebhookEvent', () => {
		it('should skip duplicate events', async () => {
			// Simulate cache.set returning null (key already existed)
			mockCache.getClient().set.mockResolvedValueOnce(null);

			const event = {
				type: 'checkout.session.completed',
				id: 'evt_duplicate',
				data: { object: {} },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'stripe.webhook.duplicate',
				expect.objectContaining({
					stripe: { eventId: 'evt_duplicate' },
				}),
			);
			// Should not have processed the event
			expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
		});

		it('should log unhandled event types', async () => {
			const event = {
				type: 'some.unhandled.event',
				id: 'evt_test',
				data: { object: {} },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'stripe.webhook.unhandled',
				expect.objectContaining({
					stripe: { eventType: 'some.unhandled.event' },
				}),
			);
		});

		it('should throw and log errors from handler', async () => {
			const error = new Error('test error');
			mockRepository.findByStripeSubscriptionId.mockRejectedValueOnce(error);

			const event = {
				type: 'customer.subscription.updated',
				id: 'evt_test',
				data: { object: makeStripeSubscription() },
			} as unknown as Stripe.Event;

			await expect(service.handleWebhookEvent(event)).rejects.toThrow('test error');
			expect(mockLogger.error).toHaveBeenCalledWith(
				'stripe.webhook.handler.error',
				expect.objectContaining({
					stripe: { eventType: 'customer.subscription.updated', eventId: 'evt_test' },
				}),
			);
		});
	});

	describe('product routing', () => {
		const makeEvent = (type: string, object: unknown): Stripe.Event =>
			({
				type,
				id: 'evt_routing',
				created: Math.floor(Date.now() / 1000),
				data: { object },
			}) as unknown as Stripe.Event;

		it('should route an add-on update to the add-on handler only', async () => {
			mockProductResolver.resolveFromSubscription.mockResolvedValueOnce('domain_addon');
			const subscription = makeStripeSubscription();
			mockStripeService.getSubscription.mockResolvedValue(subscription);

			await service.handleWebhookEvent(makeEvent('customer.subscription.updated', subscription));

			expect(mockDomainAddonWebhookService.handleSubscriptionUpsert).toHaveBeenCalled();
			expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
			expect(mockTransitionService.handleTransition).not.toHaveBeenCalled();
		});

		// No resolver stub here on purpose: session metadata alone must be enough to route.
		it('should route an add-on checkout to the add-on handler only', async () => {
			mockStripeService.getSubscription.mockResolvedValue(makeStripeSubscription());

			await service.handleWebhookEvent(
				makeEvent('checkout.session.completed', {
					id: 'cs_addon',
					metadata: { clerkUserId: 'user_test_123', product: 'domain_addon' },
					subscription: 'sub_test_123',
				}),
			);

			expect(mockDomainAddonWebhookService.handleSubscriptionUpsert).toHaveBeenCalled();
			expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
		});

		it('should route an add-on deletion to the add-on handler only', async () => {
			mockProductResolver.resolveFromSubscription.mockResolvedValueOnce('domain_addon');
			const subscription = makeStripeSubscription();

			await service.handleWebhookEvent(makeEvent('customer.subscription.deleted', subscription));

			expect(mockDomainAddonWebhookService.handleSubscriptionDeleted).toHaveBeenCalled();
			expect(mockRepository.update).not.toHaveBeenCalled();
			expect(mockTransitionService.emitCanceled).not.toHaveBeenCalled();
		});

		it('should touch neither table for an unknown product', async () => {
			mockProductResolver.resolveFromSubscription.mockResolvedValueOnce('unknown');
			const subscription = makeStripeSubscription();

			await service.handleWebhookEvent(makeEvent('customer.subscription.updated', subscription));

			expect(mockDomainAddonWebhookService.handleSubscriptionUpsert).not.toHaveBeenCalled();
			expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'stripe.webhook.unknownProduct',
				expect.anything(),
			);
		});

		it('should handle customer.subscription.created for the add-on', async () => {
			mockProductResolver.resolveFromSubscription.mockResolvedValueOnce('domain_addon');
			const subscription = makeStripeSubscription();
			mockStripeService.getSubscription.mockResolvedValue(subscription);

			await service.handleWebhookEvent(makeEvent('customer.subscription.created', subscription));

			expect(mockDomainAddonWebhookService.handleSubscriptionUpsert).toHaveBeenCalled();
		});

		it('should ignore customer.subscription.created for Pro', async () => {
			mockProductResolver.resolveFromSubscription.mockResolvedValueOnce('pro');
			const subscription = makeStripeSubscription();

			await service.handleWebhookEvent(makeEvent('customer.subscription.created', subscription));

			expect(mockDomainAddonWebhookService.handleSubscriptionUpsert).not.toHaveBeenCalled();
			expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
		});

		it('should send an add-on payment failure to the add-on handler', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);
			mockAddonRepository.findByStripeSubscriptionId.mockResolvedValue({ userId: 'user_test_123' });

			await service.handleWebhookEvent(
				makeEvent('invoice.payment_failed', {
					parent: { subscription_details: { subscription: 'sub_addon_1' } },
				}),
			);

			expect(mockDomainAddonWebhookService.handlePaymentFailed).toHaveBeenCalled();
			expect(mockTransitionService.emitPastDue).not.toHaveBeenCalled();
		});
	});

	describe('checkout.session.completed', () => {
		it('should create subscription and emit active event', async () => {
			const subscription = makeStripeSubscription();
			mockStripeService.getSubscription.mockResolvedValue(subscription);

			const session = {
				id: 'cs_test_123',
				metadata: { clerkUserId: 'user_test_123' },
				subscription: 'sub_test_123',
			} as unknown as Stripe.Checkout.Session;

			const event = {
				type: 'checkout.session.completed',
				id: 'evt_test',
				data: { object: session },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockStripeService.getSubscription).toHaveBeenCalledWith('sub_test_123');
			expect(mockRepository.upsertByStripeSubscriptionId).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_test_123',
					stripeSubscriptionId: 'sub_test_123',
					status: 'active',
				}),
			);
			expect(mockTransitionService.emitActive).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_test_123',
					stripeSubscriptionId: 'sub_test_123',
				}),
			);
		});

		it('should skip when missing userId', async () => {
			const session = {
				id: 'cs_test_123',
				metadata: {},
				subscription: 'sub_test_123',
			} as unknown as Stripe.Checkout.Session;

			const event = {
				type: 'checkout.session.completed',
				id: 'evt_test',
				data: { object: session },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'stripe.webhook.checkout.missingData',
				expect.any(Object),
			);
			expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
		});

		it('should skip when missing subscription', async () => {
			const session = {
				id: 'cs_test_123',
				metadata: { clerkUserId: 'user_test_123' },
				subscription: null,
			} as unknown as Stripe.Checkout.Session;

			const event = {
				type: 'checkout.session.completed',
				id: 'evt_test',
				data: { object: session },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
		});

		it('should handle subscription as object (not string)', async () => {
			const subscription = makeStripeSubscription();
			mockStripeService.getSubscription.mockResolvedValue(subscription);

			const session = {
				id: 'cs_test_123',
				metadata: { clerkUserId: 'user_test_123' },
				subscription: { id: 'sub_test_123' },
			} as unknown as Stripe.Checkout.Session;

			const event = {
				type: 'checkout.session.completed',
				id: 'evt_test',
				data: { object: session },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockStripeService.getSubscription).toHaveBeenCalledWith('sub_test_123');
		});
	});

	describe('customer.subscription.updated', () => {
		it('should update subscription and handle status transition', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				status: 'active',
				stripePriceId: 'price_monthly',
				cancelAtPeriodEnd: false,
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const subscription = makeStripeSubscription({ status: 'past_due' });

			const event = {
				type: 'customer.subscription.updated',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockRepository.upsertByStripeSubscriptionId).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_test_123',
					status: 'past_due',
				}),
			);
			expect(mockTransitionService.handleTransition).toHaveBeenCalledWith(
				expect.objectContaining({
					previousStatus: 'active',
					newStatus: 'past_due',
				}),
			);
		});

		it('should skip when subscription not found locally', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);

			const subscription = makeStripeSubscription();
			const event = {
				type: 'customer.subscription.updated',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'stripe.webhook.subscription.notFound',
				expect.any(Object),
			);
			expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
		});

		it('should emit cancelInitiated when cancelAtPeriodEnd flips to true', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				status: 'active',
				stripePriceId: 'price_monthly',
				cancelAtPeriodEnd: false,
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const subscription = makeStripeSubscription({ cancel_at_period_end: true });

			const event = {
				type: 'customer.subscription.updated',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockTransitionService.emitCancelInitiated).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_test_123',
					stripeSubscriptionId: 'sub_test_123',
				}),
			);
		});

		it('should not emit cancelInitiated when cancelAtPeriodEnd was already true', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				status: 'active',
				stripePriceId: 'price_monthly',
				cancelAtPeriodEnd: true,
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const subscription = makeStripeSubscription({ cancel_at_period_end: true });

			const event = {
				type: 'customer.subscription.updated',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockTransitionService.emitCancelInitiated).not.toHaveBeenCalled();
		});

		it('should clear cancellation notifications when cancelAtPeriodEnd flips to false', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				status: 'active',
				stripePriceId: 'price_monthly',
				cancelAtPeriodEnd: true,
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const subscription = makeStripeSubscription({ cancel_at_period_end: false });

			const event = {
				type: 'customer.subscription.updated',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockRepository.clearCancellationNotifications).toHaveBeenCalledWith('user_test_123');
		});

		it('should handle customer as object (not string)', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				status: 'active',
				stripePriceId: 'price_monthly',
				cancelAtPeriodEnd: false,
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const subscription = makeStripeSubscription({
				customer: { id: 'cus_obj_test' } as any,
			});

			const event = {
				type: 'customer.subscription.updated',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockRepository.upsertByStripeSubscriptionId).toHaveBeenCalledWith(
				expect.objectContaining({
					stripeCustomerId: 'cus_obj_test',
				}),
			);
		});
	});

	describe('customer.subscription.deleted', () => {
		it('should mark subscription as canceled and emit canceled event', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				status: 'active',
				stripePriceId: 'price_monthly',
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const subscription = makeStripeSubscription({ status: 'canceled' });

			const event = {
				type: 'customer.subscription.deleted',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockRepository.update).toHaveBeenCalledWith(
				existing,
				expect.objectContaining({
					status: 'canceled',
					cancelAtPeriodEnd: false,
				}),
			);
			expect(mockTransitionService.emitCanceled).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_test_123',
					stripeSubscriptionId: 'sub_test_123',
				}),
			);
		});

		it('should skip when subscription not found locally', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);

			const subscription = makeStripeSubscription();
			const event = {
				type: 'customer.subscription.deleted',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'stripe.webhook.subscription.deleteNotFound',
				expect.any(Object),
			);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('invoice.payment_failed', () => {
		it('should emit past due event when subscription exists', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				stripePriceId: 'price_monthly',
				currentPeriodEnd: new Date(),
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const invoice = {
				parent: { subscription_details: { subscription: 'sub_test_123' } },
			} as unknown as Stripe.Invoice;

			const event = {
				type: 'invoice.payment_failed',
				id: 'evt_test',
				data: { object: invoice },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockTransitionService.emitPastDue).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_test_123',
					stripeSubscriptionId: 'sub_test_123',
				}),
			);
		});

		it('should skip when no subscription ID on invoice', async () => {
			const invoice = {
				parent: { subscription_details: { subscription: null } },
			} as unknown as Stripe.Invoice;

			const event = {
				type: 'invoice.payment_failed',
				id: 'evt_test',
				data: { object: invoice },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockTransitionService.emitPastDue).not.toHaveBeenCalled();
		});

		it('should skip when subscription not found locally', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);

			const invoice = {
				parent: { subscription_details: { subscription: 'sub_nonexistent' } },
			} as unknown as Stripe.Invoice;

			const event = {
				type: 'invoice.payment_failed',
				id: 'evt_test',
				data: { object: invoice },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockTransitionService.emitPastDue).not.toHaveBeenCalled();
		});

		it('should handle subscription as object (not string)', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				stripePriceId: 'price_monthly',
				currentPeriodEnd: new Date(),
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const invoice = {
				parent: { subscription_details: { subscription: { id: 'sub_test_obj' } } },
			} as unknown as Stripe.Invoice;

			const event = {
				type: 'invoice.payment_failed',
				id: 'evt_test',
				data: { object: invoice },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			expect(mockRepository.findByStripeSubscriptionId).toHaveBeenCalledWith('sub_test_obj');
		});
	});

	describe('getSubscriptionPeriod fallback', () => {
		it('should fetch full subscription when period dates are missing', async () => {
			const existing = {
				id: 'local_sub_id',
				userId: 'user_test_123',
				status: 'active',
				stripePriceId: 'price_monthly',
				cancelAtPeriodEnd: false,
			};
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing as any);

			const fullSubscription = makeStripeSubscription();
			mockStripeService.getSubscription.mockResolvedValue(fullSubscription);

			// Subscription whose items carry no period dates
			const subscription = makeStripeSubscription({
				items: {
					data: [{ price: { id: 'price_monthly' } }],
				} as any,
			});

			const event = {
				type: 'customer.subscription.updated',
				id: 'evt_test',
				data: { object: subscription },
			} as unknown as Stripe.Event;

			await service.handleWebhookEvent(event);

			// Should have fetched the full subscription to get period dates
			expect(mockStripeService.getSubscription).toHaveBeenCalledWith('sub_test_123');
		});
	});
});
