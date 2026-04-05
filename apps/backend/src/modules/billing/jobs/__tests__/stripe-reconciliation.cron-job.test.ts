import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { type StripeService } from '../../service/stripe.service';
import { type SubscriptionStatusTransitionService } from '../../service/subscription-status-transition.service';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import { type TUserSubscription } from '../../domain/entities/user-subscription.entity';
import { container } from 'tsyringe';
import type Stripe from 'stripe';

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
				default:
					return {};
			}
		});

		mockRepository.findAllNonCanceled.mockResolvedValue([]);
		mockStripeService.listActiveSubscriptions.mockResolvedValue([]);

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
			current_period_start: periodStart,
			current_period_end: periodEnd,
			items: { data: [{ price: { id: 'price_new' } }] },
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
			current_period_start: periodStart,
			current_period_end: periodEnd,
			items: { data: [{ price: { id: 'price_old' } }] },
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
			current_period_start: periodStart,
			current_period_end: periodEnd,
			items: { data: [{ price: { id: 'price_old' } }] },
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
				current_period_start: periodStart,
				current_period_end: periodEnd,
				customer: 'cus_123',
				metadata: { clerkUserId: 'user-456' },
				items: { data: [{ price: { id: 'price_123' } }] },
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

	it('should skip Stripe subscription without clerkUserId metadata', async () => {
		mockStripeService.listActiveSubscriptions.mockResolvedValue([
			{
				id: 'sub_orphan',
				status: 'active',
				metadata: {},
				items: { data: [{ price: { id: 'price_123' } }] },
				current_period_start: periodStart,
				current_period_end: periodEnd,
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
