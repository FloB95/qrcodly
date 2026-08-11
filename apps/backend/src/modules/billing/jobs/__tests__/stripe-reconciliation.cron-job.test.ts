import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { type StripeService } from '../../service/stripe.service';
import { type SubscriptionStatusTransitionService } from '../../service/subscription-status-transition.service';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import { type TUserSubscription } from '../../domain/entities/user-subscription.entity';
import { container } from 'tsyringe';
import type Stripe from 'stripe';
import { env } from '@/core/config/env';

const PRO_PRICE_ID = env.STRIPE_PRO_PRICE_ID_MONTHLY;

jest.mock('@/core/decorators/cron-job.decorator', () => ({
	CronJob: () => () => {},
}));

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

// Import after mocks are set up
import { StripeReconciliationCronJob } from '../stripe-reconciliation.cron-job';

describe('StripeReconciliationCronJob', () => {
	let job: StripeReconciliationCronJob;
	let mockLogger: MockProxy<Logger>;
	let mockStripeService: MockProxy<StripeService>;
	let mockRepository: MockProxy<UserSubscriptionRepository>;
	let mockTransitionService: MockProxy<SubscriptionStatusTransitionService>;
	let mockAddonRepository: Record<string, jest.Mock>;
	let mockAddonWebhookService: Record<string, jest.Mock>;

	const now = new Date();
	const periodEnd = Math.floor(now.getTime() / 1000) + 86400;
	const periodStart = Math.floor(now.getTime() / 1000) - 86400 * 30;

	const mockLocalSubscription = {
		id: 'local-1',
		userId: 'user-123',
		stripeSubscriptionId: 'sub_123',
		stripePriceId: 'price_old',
		status: 'active',
		cancelAtPeriodEnd: false,
		currentPeriodEnd: new Date((periodEnd - 1000) * 1000),
	} as TUserSubscription;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockStripeService = mock<StripeService>();
		mockRepository = mock<UserSubscriptionRepository>();
		mockTransitionService = mock<SubscriptionStatusTransitionService>();
		mockAddonRepository = {
			findAllNonCanceled: jest.fn().mockResolvedValue([]),
			findAllForReconciliation: jest.fn().mockResolvedValue([]),
			findByStripeSubscriptionId: jest.fn().mockResolvedValue(undefined),
		};
		mockAddonWebhookService = { handleSubscriptionUpsert: jest.fn() };

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'Logger':
					return mockLogger;
				case 'StripeService':
					return mockStripeService;
				case 'UserSubscriptionRepository':
					return mockRepository;
				case 'SubscriptionStatusTransitionService':
					return mockTransitionService;
				case 'UserAddonSubscriptionRepository':
					return mockAddonRepository;
				case 'DomainAddonWebhookService':
					return mockAddonWebhookService;
				default:
					return {};
			}
		});

		mockRepository.findAllNonCanceled.mockResolvedValue([]);
		mockStripeService.listActiveSubscriptions.mockResolvedValue([]);
		mockAddonRepository.findAllNonCanceled.mockResolvedValue([]);
		mockAddonRepository.findAllForReconciliation.mockResolvedValue([]);
		mockStripeService.listSubscriptionsForCustomer.mockResolvedValue([]);
		mockAddonRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);

		job = new StripeReconciliationCronJob();
		// Override the logger that AbstractCronJob resolves in the field initializer
		(job as unknown as { logger: Logger }).logger = mockLogger;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should log completion with zero counts when no subscriptions exist', async () => {
		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockLogger.info).toHaveBeenCalledWith(
			'stripe.reconciliation.complete',
			expect.objectContaining({
				stripe: { totalVerified: 0, reconciled: 0, created: 0, errors: 0 },
			}),
		);
	});

	it('should update local subscription when Stripe data differs', async () => {
		mockRepository.findAllNonCanceled.mockResolvedValue([mockLocalSubscription]);
		mockStripeService.getSubscription.mockResolvedValue({
			id: 'sub_123',
			status: 'past_due',
			cancel_at_period_end: false,
			items: {
				data: [
					{
						price: { id: 'price_new' },
						current_period_start: periodStart,
						current_period_end: periodEnd,
					},
				],
			},
		} as unknown as Stripe.Subscription);

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockRepository.update).toHaveBeenCalledWith(
			mockLocalSubscription,
			expect.objectContaining({
				status: 'past_due',
				stripePriceId: 'price_new',
			}),
		);
		expect(mockTransitionService.handleTransition).toHaveBeenCalledWith(
			expect.objectContaining({
				previousStatus: 'active',
				newStatus: 'past_due',
			}),
		);
	});

	it('should emit cancel initiated when cancel_at_period_end flips to true', async () => {
		mockRepository.findAllNonCanceled.mockResolvedValue([mockLocalSubscription]);
		mockStripeService.getSubscription.mockResolvedValue({
			id: 'sub_123',
			status: 'active',
			cancel_at_period_end: true,
			items: {
				data: [
					{
						price: { id: 'price_old' },
						current_period_start: periodStart,
						current_period_end: periodEnd,
					},
				],
			},
		} as unknown as Stripe.Subscription);

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockTransitionService.emitCancelInitiated).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-123' }),
		);
	});

	it('should clear cancellation notifications when cancel_at_period_end flips to false', async () => {
		const localWithCancel = {
			...mockLocalSubscription,
			cancelAtPeriodEnd: true,
		} as TUserSubscription;
		mockRepository.findAllNonCanceled.mockResolvedValue([localWithCancel]);
		mockStripeService.getSubscription.mockResolvedValue({
			id: 'sub_123',
			status: 'active',
			cancel_at_period_end: false,
			items: {
				data: [
					{
						price: { id: 'price_old' },
						current_period_start: periodStart,
						current_period_end: periodEnd,
					},
				],
			},
		} as unknown as Stripe.Subscription);

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockRepository.clearCancellationNotifications).toHaveBeenCalledWith('user-123');
	});

	it('should create missing local records for Stripe subscriptions', async () => {
		mockStripeService.listActiveSubscriptions.mockResolvedValue([
			{
				id: 'sub_new',
				status: 'active',
				cancel_at_period_end: false,
				customer: 'cus_123',
				metadata: { clerkUserId: 'user-456' },
				items: {
					data: [
						{
							price: { id: PRO_PRICE_ID },
							current_period_start: periodStart,
							current_period_end: periodEnd,
						},
					],
				},
			} as unknown as Stripe.Subscription,
		]);
		mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);
		mockRepository.findByUserId.mockResolvedValue(undefined);

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockRepository.upsertByStripeSubscriptionId).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-456',
				stripeSubscriptionId: 'sub_new',
				status: 'active',
			}),
		);
	});

	it('should never adopt a non-Pro subscription into the Pro record', async () => {
		// A user whose Pro lapsed but who still pays for a domain add-on: without the price
		// filter the add-on would overwrite the canceled Pro row and hand out Pro for free.
		const canceledPro: TUserSubscription = {
			...mockLocalSubscription,
			userId: 'user-789',
			status: 'canceled',
		};

		mockStripeService.listActiveSubscriptions.mockResolvedValue([
			{
				id: 'sub_addon',
				status: 'active',
				cancel_at_period_end: false,
				customer: 'cus_789',
				metadata: { clerkUserId: 'user-789', product: 'domain_addon' },
				items: {
					data: [
						{
							price: { id: 'price_domain_addon_monthly' },
							quantity: 3,
							current_period_start: periodStart,
							current_period_end: periodEnd,
						},
					],
				},
			} as unknown as Stripe.Subscription,
		]);
		mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);
		mockRepository.findByUserId.mockResolvedValue(canceledPro);

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockRepository.update).not.toHaveBeenCalled();
		expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
		expect(mockTransitionService.handleTransition).not.toHaveBeenCalled();
		expect(mockLogger.info).toHaveBeenCalledWith(
			'stripe.reconciliation.complete',
			expect.objectContaining({
				stripe: expect.objectContaining({ created: 0, errors: 0 }),
			}),
		);
	});

	it('should skip Stripe subscription without clerkUserId metadata', async () => {
		mockStripeService.listActiveSubscriptions.mockResolvedValue([
			{
				id: 'sub_orphan',
				status: 'active',
				metadata: {},
				items: {
					data: [
						{
							price: { id: PRO_PRICE_ID },
							current_period_start: periodStart,
							current_period_end: periodEnd,
						},
					],
				},
				customer: 'cus_123',
				cancel_at_period_end: false,
			} as unknown as Stripe.Subscription,
		]);
		mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'stripe.reconciliation.missingUserId',
			expect.anything(),
		);
		expect(mockRepository.upsertByStripeSubscriptionId).not.toHaveBeenCalled();
	});

	describe('domain add-on reconciliation', () => {
		const addonSubscription = (overrides: Record<string, unknown> = {}) =>
			({
				id: 'sub_addon_1',
				status: 'active',
				created: 1_700_000_000,
				cancel_at_period_end: false,
				customer: 'cus_addon',
				metadata: { clerkUserId: 'user-999' },
				items: {
					data: [
						{
							price: { id: env.STRIPE_ADDON_DOMAIN_PRICE_ID_MONTHLY },
							quantity: 2,
							current_period_start: periodStart,
							current_period_end: periodEnd,
						},
					],
				},
				...overrides,
			}) as unknown as Stripe.Subscription;

		/** A customer we know about, which is what makes the add-on reachable at all. */
		const knownCustomer = () =>
			mockAddonRepository.findAllForReconciliation.mockResolvedValue([
				{ stripeCustomerId: 'cus_addon', userId: 'user-999' },
			]);

		it('should adopt an add-on subscription that never reached the database', async () => {
			knownCustomer();
			mockStripeService.listSubscriptionsForCustomer.mockResolvedValue([addonSubscription()]);

			await (job as unknown as { execute: () => Promise<void> }).execute();

			expect(mockAddonWebhookService.handleSubscriptionUpsert).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'sub_addon_1' }),
				expect.objectContaining({ period: expect.anything(), forceScheduleRefresh: true }),
			);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'stripe.reconciliation.addon.adopted',
				expect.anything(),
			);
		});

		it('should find an add-on that the unscoped Stripe listing cannot see', async () => {
			// Stripe hides test-clock objects from unfiltered list calls, so going through the
			// customer is the only way a staging setup is ever reconciled.
			knownCustomer();
			mockStripeService.listActiveSubscriptions.mockResolvedValue([]);
			mockStripeService.listSubscriptionsForCustomer.mockResolvedValue([addonSubscription()]);

			await (job as unknown as { execute: () => Promise<void> }).execute();

			expect(mockStripeService.listSubscriptionsForCustomer).toHaveBeenCalledWith('cus_addon');
			expect(mockAddonWebhookService.handleSubscriptionUpsert).toHaveBeenCalled();
		});

		it('should adopt a re-purchase even though the stored row is canceled', async () => {
			// The old pass skipped canceled rows entirely, so buying again after a cancellation
			// went unnoticed whenever the webhook was lost.
			mockAddonRepository.findAllForReconciliation.mockResolvedValue([
				{ stripeCustomerId: 'cus_addon', userId: 'user-999', status: 'canceled' },
			]);
			mockStripeService.listSubscriptionsForCustomer.mockResolvedValue([
				addonSubscription({ id: 'sub_addon_old', status: 'canceled', created: 1 }),
				addonSubscription({ id: 'sub_addon_new', status: 'active', created: 2 }),
			]);

			await (job as unknown as { execute: () => Promise<void> }).execute();

			expect(mockAddonWebhookService.handleSubscriptionUpsert).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'sub_addon_new' }),
				expect.anything(),
			);
		});

		it('should repair drift on a stored add-on', async () => {
			knownCustomer();
			mockAddonRepository.findByStripeSubscriptionId.mockResolvedValue({ id: 'row-1' });
			mockStripeService.listSubscriptionsForCustomer.mockResolvedValue([
				addonSubscription({ status: 'past_due' }),
			]);

			await (job as unknown as { execute: () => Promise<void> }).execute();

			expect(mockAddonWebhookService.handleSubscriptionUpsert).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'past_due' }),
				expect.anything(),
			);
			expect(mockLogger.warn).not.toHaveBeenCalledWith(
				'stripe.reconciliation.addon.adopted',
				expect.anything(),
			);
		});

		it('should fall back to the known user when the subscription carries no metadata', async () => {
			// Bought straight in the Stripe dashboard: no clerkUserId, but we resolved the customer
			// from our own records, so it can still be adopted.
			knownCustomer();
			mockStripeService.listSubscriptionsForCustomer.mockResolvedValue([
				addonSubscription({ metadata: {} }),
			]);

			await (job as unknown as { execute: () => Promise<void> }).execute();

			expect(mockAddonWebhookService.handleSubscriptionUpsert).toHaveBeenCalledWith(
				expect.objectContaining({ metadata: { clerkUserId: 'user-999' } }),
				expect.anything(),
			);
		});

		it('should ignore a customer that holds no add-on', async () => {
			knownCustomer();
			mockStripeService.listSubscriptionsForCustomer.mockResolvedValue([
				addonSubscription({ items: { data: [{ price: { id: 'price_something_else' } }] } }),
			]);

			await (job as unknown as { execute: () => Promise<void> }).execute();

			expect(mockAddonWebhookService.handleSubscriptionUpsert).not.toHaveBeenCalled();
		});

		it('should keep going when one customer fails', async () => {
			knownCustomer();
			mockStripeService.listSubscriptionsForCustomer.mockRejectedValue(new Error('Stripe down'));

			await (job as unknown as { execute: () => Promise<void> }).execute();

			expect(mockLogger.error).toHaveBeenCalledWith(
				'stripe.reconciliation.addon.verifyError',
				expect.anything(),
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'stripe.reconciliation.addon.complete',
				expect.objectContaining({ stripe: expect.objectContaining({ errors: 1 }) }),
			);
		});
	});

	it('should log error and continue when single subscription verification fails', async () => {
		mockRepository.findAllNonCanceled.mockResolvedValue([mockLocalSubscription]);
		mockStripeService.getSubscription.mockRejectedValue(new Error('Stripe API error'));

		await (job as unknown as { execute: () => Promise<void> }).execute();

		expect(mockLogger.error).toHaveBeenCalledWith(
			'stripe.reconciliation.verifyError',
			expect.anything(),
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			'stripe.reconciliation.complete',
			expect.objectContaining({
				stripe: expect.objectContaining({ errors: 1 }),
			}),
		);
	});
});
