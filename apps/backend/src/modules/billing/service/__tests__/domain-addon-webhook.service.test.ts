import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import type Stripe from 'stripe';
import { DomainAddonWebhookService } from '../domain-addon-webhook.service';
import type UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';
import { type AddonSubscriptionStatusTransitionService } from '../addon-subscription-status-transition.service';
import { type ApplyPendingAddonQuantityUseCase } from '../../useCase/apply-pending-addon-quantity.use-case';
import { type TUserAddonSubscription } from '../../domain/entities/user-addon-subscription.entity';
import { type Logger } from '@/core/logging';

const USER_ID = 'user_test_123';
const NOW = new Date('2026-06-15T12:00:00Z');
const PERIOD_START = new Date('2026-06-01T00:00:00Z');
const PERIOD_END = new Date('2026-07-01T00:00:00Z');

const stripeSubscription = (
	overrides: {
		quantity?: number;
		status?: string;
		cancelAtPeriodEnd?: boolean;
		metadata?: Record<string, string>;
	} = {},
): Stripe.Subscription =>
	({
		id: 'sub_addon_1',
		customer: 'cus_1',
		status: overrides.status ?? 'active',
		cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
		metadata: overrides.metadata ?? { clerkUserId: USER_ID },
		items: {
			data: [{ price: { id: 'price_addon_monthly' }, quantity: overrides.quantity ?? 2 }],
		},
	}) as unknown as Stripe.Subscription;

const storedAddon = (overrides: Partial<TUserAddonSubscription> = {}): TUserAddonSubscription =>
	({
		id: 'row-1',
		userId: USER_ID,
		addonType: 'custom_domain',
		stripeSubscriptionId: 'sub_addon_1',
		stripePriceId: 'price_addon_monthly',
		status: 'active',
		quantity: 5,
		pendingQuantity: null,
		pendingQuantityEffectiveAt: null,
		currentPeriodStart: PERIOD_START,
		currentPeriodEnd: PERIOD_END,
		cancelAtPeriodEnd: false,
		lastStripeEventAt: null,
		...overrides,
	}) as TUserAddonSubscription;

describe('DomainAddonWebhookService', () => {
	let service: DomainAddonWebhookService;
	let mockRepository: MockProxy<UserAddonSubscriptionRepository>;
	let mockTransitionService: MockProxy<AddonSubscriptionStatusTransitionService>;
	let mockApplyPending: MockProxy<ApplyPendingAddonQuantityUseCase>;
	let mockLogger: MockProxy<Logger>;

	const upsert = (
		subscription: Stripe.Subscription,
		period = { periodStart: PERIOD_START, periodEnd: PERIOD_END },
	) => service.handleSubscriptionUpsert(subscription, { eventCreatedAt: NOW, period });

	beforeEach(() => {
		mockRepository = mock<UserAddonSubscriptionRepository>();
		mockTransitionService = mock<AddonSubscriptionStatusTransitionService>();
		mockApplyPending = mock<ApplyPendingAddonQuantityUseCase>();
		mockLogger = mock<Logger>();
		service = new DomainAddonWebhookService(
			mockLogger,
			mockRepository,
			mockTransitionService,
			mockApplyPending,
		);

		mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);
		mockRepository.findByUserAndType.mockResolvedValue(undefined);
		mockRepository.upsertByUserAndType.mockImplementation(async (data) =>
			storedAddon({ ...data, pendingQuantity: null, pendingQuantityEffectiveAt: null }),
		);
	});

	afterEach(() => jest.clearAllMocks());

	describe('quantity sync', () => {
		it('should create the row from metadata when no record exists yet', async () => {
			await upsert(stripeSubscription({ quantity: 3 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ userId: USER_ID, quantity: 3, addonType: 'custom_domain' }),
			);
		});

		it('should take the Stripe quantity when nothing is pending', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon({ quantity: 2 }));

			await upsert(stripeSubscription({ quantity: 4 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ quantity: 4 }),
			);
		});

		it('should hold the higher quantity while a reduction is pending', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ quantity: 5, pendingQuantity: 2, pendingQuantityEffectiveAt: PERIOD_END }),
			);

			await upsert(stripeSubscription({ quantity: 2 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ quantity: 5 }),
			);
			expect(mockRepository.schedulePendingQuantity).toHaveBeenCalledWith(
				expect.anything(),
				2,
				PERIOD_END,
			);
			expect(mockApplyPending.execute).not.toHaveBeenCalled();
		});

		it('should let an increase supersede a pending reduction', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ quantity: 5, pendingQuantity: 3, pendingQuantityEffectiveAt: PERIOD_END }),
			);

			await upsert(stripeSubscription({ quantity: 6 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ quantity: 6 }),
			);
			expect(mockRepository.clearPendingQuantity).toHaveBeenCalled();
			expect(mockRepository.schedulePendingQuantity).not.toHaveBeenCalled();
		});

		it('should apply the pending reduction once the period has rolled', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ quantity: 5, pendingQuantity: 2, pendingQuantityEffectiveAt: PERIOD_END }),
			);

			await upsert(stripeSubscription({ quantity: 2 }), {
				periodStart: PERIOD_END,
				periodEnd: new Date('2026-08-01T00:00:00Z'),
			});

			expect(mockApplyPending.execute).toHaveBeenCalledWith(expect.anything(), { quantity: 2 });
			expect(mockRepository.schedulePendingQuantity).not.toHaveBeenCalled();
		});
	});

	describe('guards', () => {
		it('should ignore an event older than the last one applied', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ lastStripeEventAt: new Date('2026-06-20T00:00:00Z') }),
			);

			await upsert(stripeSubscription({ quantity: 9 }));

			expect(mockRepository.upsertByUserAndType).not.toHaveBeenCalled();
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'stripe.webhook.addon.staleEvent',
				expect.anything(),
			);
		});

		it('should give up when no user can be determined', async () => {
			await upsert(stripeSubscription({ metadata: {} }));

			expect(mockRepository.upsertByUserAndType).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'stripe.webhook.addon.missingUserId',
				expect.anything(),
			);
		});

		it('should reuse the existing row when a canceled add-on is re-purchased', async () => {
			mockRepository.findByUserAndType.mockResolvedValue(
				storedAddon({ stripeSubscriptionId: 'sub_addon_old', status: 'canceled' }),
			);

			await upsert(stripeSubscription({ quantity: 1 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ stripeSubscriptionId: 'sub_addon_1', userId: USER_ID }),
			);
		});
	});

	describe('cancellation', () => {
		it('should emit cancel initiated when the flag flips on', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ cancelAtPeriodEnd: false }),
			);

			await upsert(stripeSubscription({ cancelAtPeriodEnd: true }));

			expect(mockTransitionService.emitCancelInitiated).toHaveBeenCalledWith(
				expect.objectContaining({ userId: USER_ID }),
			);
		});

		it('should clear cancellation notices when the flag flips off', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ cancelAtPeriodEnd: true }),
			);

			await upsert(stripeSubscription({ cancelAtPeriodEnd: false }));

			expect(mockRepository.clearCancellationNotifications).toHaveBeenCalled();
		});

		it('should mark the row canceled on deletion', async () => {
			const existing = storedAddon();
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(existing);

			await service.handleSubscriptionDeleted(stripeSubscription(), {
				period: { periodEnd: PERIOD_END },
			});

			expect(mockRepository.update).toHaveBeenCalledWith(existing, {
				status: 'canceled',
				cancelAtPeriodEnd: false,
			});
			expect(mockTransitionService.emitCanceled).toHaveBeenCalled();
		});
	});
});
