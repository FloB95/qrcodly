import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import type Stripe from 'stripe';
import { DomainAddonWebhookService } from '../domain-addon-webhook.service';
import type UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';
import { type AddonSubscriptionStatusTransitionService } from '../addon-subscription-status-transition.service';
import { type EnforceCustomDomainLimitUseCase } from '../../useCase/enforce-custom-domain-limit.use-case';
import { type StripeService } from '../stripe.service';
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
		cancelAt?: number | null;
		metadata?: Record<string, string>;
		schedule?: string | null;
	} = {},
): Stripe.Subscription =>
	({
		id: 'sub_addon_1',
		customer: 'cus_1',
		status: overrides.status ?? 'active',
		cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
		cancel_at: overrides.cancelAt ?? null,
		metadata: overrides.metadata ?? { clerkUserId: USER_ID },
		schedule: overrides.schedule ?? null,
		items: {
			data: [{ price: { id: 'price_addon_monthly' }, quantity: overrides.quantity ?? 2 }],
		},
	}) as unknown as Stripe.Subscription;

/** A schedule whose second phase drops the quantity when the current period ends. */
const stripeSchedule = (
	overrides: {
		id?: string;
		status?: string;
		subscription?: string | null;
		releasedSubscription?: string | null;
		scheduledQuantity?: number;
	} = {},
): Stripe.SubscriptionSchedule =>
	({
		id: overrides.id ?? 'sub_sched_1',
		status: overrides.status ?? 'active',
		subscription: overrides.subscription === undefined ? 'sub_addon_1' : overrides.subscription,
		released_subscription: overrides.releasedSubscription ?? null,
		current_phase: {
			start_date: Math.floor(PERIOD_START.getTime() / 1000),
			end_date: Math.floor(PERIOD_END.getTime() / 1000),
		},
		phases: [
			{
				start_date: Math.floor(PERIOD_START.getTime() / 1000),
				end_date: Math.floor(PERIOD_END.getTime() / 1000),
				items: [{ price: 'price_addon_monthly', quantity: 5 }],
			},
			{
				start_date: Math.floor(PERIOD_END.getTime() / 1000),
				items: [{ price: 'price_addon_monthly', quantity: overrides.scheduledQuantity ?? 2 }],
			},
		],
	}) as unknown as Stripe.SubscriptionSchedule;

const storedAddon = (overrides: Partial<TUserAddonSubscription> = {}): TUserAddonSubscription =>
	({
		id: 'row-1',
		userId: USER_ID,
		addonType: 'custom_domain',
		stripeSubscriptionId: 'sub_addon_1',
		stripePriceId: 'price_addon_monthly',
		status: 'active',
		quantity: 5,
		currentPeriodStart: PERIOD_START,
		currentPeriodEnd: PERIOD_END,
		cancelAtPeriodEnd: false,
		lastStripeEventAt: null,
		stripeScheduleId: null,
		scheduledQuantity: null,
		scheduledQuantityEffectiveAt: null,
		...overrides,
	}) as TUserAddonSubscription;

describe('DomainAddonWebhookService', () => {
	let service: DomainAddonWebhookService;
	let mockRepository: MockProxy<UserAddonSubscriptionRepository>;
	let mockTransitionService: MockProxy<AddonSubscriptionStatusTransitionService>;
	let mockEnforce: MockProxy<EnforceCustomDomainLimitUseCase>;
	let mockStripeService: MockProxy<StripeService>;
	let mockLogger: MockProxy<Logger>;

	const upsert = (
		subscription: Stripe.Subscription,
		period = { periodStart: PERIOD_START, periodEnd: PERIOD_END },
	) => service.handleSubscriptionUpsert(subscription, { eventCreatedAt: NOW, period });

	beforeEach(() => {
		mockRepository = mock<UserAddonSubscriptionRepository>();
		mockTransitionService = mock<AddonSubscriptionStatusTransitionService>();
		mockEnforce = mock<EnforceCustomDomainLimitUseCase>();
		mockStripeService = mock<StripeService>();
		mockLogger = mock<Logger>();
		service = new DomainAddonWebhookService(
			mockLogger,
			mockRepository,
			mockTransitionService,
			mockEnforce,
			mockStripeService,
		);

		mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);
		mockRepository.findByUserAndType.mockResolvedValue(undefined);
		mockEnforce.execute.mockResolvedValue({ effectiveLimit: 5, enabled: [], disabled: [] });
		mockRepository.upsertByUserAndType.mockImplementation(async (data) => storedAddon({ ...data }));
	});

	afterEach(() => jest.clearAllMocks());

	describe('quantity sync', () => {
		it('should create the row from metadata when no record exists yet', async () => {
			await upsert(stripeSubscription({ quantity: 3 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ userId: USER_ID, quantity: 3, addonType: 'custom_domain' }),
			);
		});

		it('should take the Stripe quantity as the entitlement', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon({ quantity: 2 }));

			await upsert(stripeSubscription({ quantity: 4 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ quantity: 4 }),
			);
		});

		it('should apply a reduction immediately, including one made in the Stripe portal', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon({ quantity: 5 }));

			await upsert(stripeSubscription({ quantity: 2 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ quantity: 2 }),
			);
		});

		it('should bring the domains in line whenever the quantity changed', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon({ quantity: 5 }));
			mockEnforce.execute.mockResolvedValue({
				effectiveLimit: 3,
				enabled: [],
				disabled: ['b.example.com'],
			});

			await upsert(stripeSubscription({ quantity: 2 }));

			expect(mockEnforce.execute).toHaveBeenCalledWith(USER_ID);
		});

		it('should not touch the domains when the quantity is unchanged', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon({ quantity: 2 }));

			await upsert(stripeSubscription({ quantity: 2 }));

			expect(mockEnforce.execute).not.toHaveBeenCalled();
		});

		it('should clear the mirror once the subscription has no schedule left', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ quantity: 5, stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);

			await upsert(stripeSubscription({ quantity: 2, schedule: null }));

			// Reading it off the subscription costs no API call and is what makes the mirror
			// self-healing after Stripe applied the reduction.
			expect(mockStripeService.getScheduledQuantity).not.toHaveBeenCalled();
			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ scheduledChange: null }),
			);
		});

		it('should adopt a schedule it has not seen before', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon({ quantity: 5 }));
			mockStripeService.getScheduledQuantity.mockResolvedValue({
				quantity: 2,
				effectiveAt: PERIOD_END,
			});

			await upsert(stripeSubscription({ quantity: 5, schedule: 'sub_sched_1' }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({
					scheduledChange: {
						stripeScheduleId: 'sub_sched_1',
						quantity: 2,
						effectiveAt: PERIOD_END,
					},
				}),
			);
		});

		it('should leave a known schedule alone rather than re-fetch it', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ quantity: 5, stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);

			await upsert(stripeSubscription({ quantity: 5, schedule: 'sub_sched_1' }));

			expect(mockStripeService.getScheduledQuantity).not.toHaveBeenCalled();
			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ scheduledChange: undefined }),
			);
		});

		it('should re-read a known schedule when a refresh is forced', async () => {
			// Reconciliation's job: a schedule can be rewritten in place, so a lost
			// `subscription_schedule.updated` would otherwise never be repaired.
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ quantity: 5, stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);
			mockStripeService.getScheduledQuantity.mockResolvedValue({
				quantity: 1,
				effectiveAt: PERIOD_END,
			});

			await service.handleSubscriptionUpsert(
				stripeSubscription({ quantity: 5, schedule: 'sub_sched_1' }),
				{
					eventCreatedAt: NOW,
					period: { periodStart: PERIOD_START, periodEnd: PERIOD_END },
					forceScheduleRefresh: true,
				},
			);

			expect(mockStripeService.getScheduledQuantity).toHaveBeenCalledWith('sub_sched_1');
			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({
					scheduledChange: {
						stripeScheduleId: 'sub_sched_1',
						quantity: 1,
						effectiveAt: PERIOD_END,
					},
				}),
			);
		});

		it('should confirm by email when a parked reduction has taken effect', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ quantity: 5, stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);

			await upsert(stripeSubscription({ quantity: 2, schedule: null }));

			expect(mockTransitionService.emitQuantityReduced).toHaveBeenCalledWith({
				userId: USER_ID,
				stripeSubscriptionId: 'sub_addon_1',
				quantity: 2,
			});
		});

		it('should not confirm a reduction the user never scheduled', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon({ quantity: 5 }));

			await upsert(stripeSubscription({ quantity: 3 }));

			expect(mockTransitionService.emitQuantityReduced).not.toHaveBeenCalled();
		});
	});

	describe('schedule events', () => {
		it('should mirror the upcoming phase of a new schedule', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon());

			await service.handleScheduleEvent(stripeSchedule({ scheduledQuantity: 2 }), {
				cleared: false,
			});

			expect(mockRepository.setScheduledQuantity).toHaveBeenCalledWith(expect.anything(), {
				stripeScheduleId: 'sub_sched_1',
				quantity: 2,
				effectiveAt: PERIOD_END,
			});
		});

		it('should clear the mirror when its schedule is released', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);

			await service.handleScheduleEvent(
				stripeSchedule({ subscription: null, releasedSubscription: 'sub_addon_1' }),
				{ cleared: true },
			);

			expect(mockRepository.clearScheduledQuantity).toHaveBeenCalled();
		});

		it('should not let a stale release wipe a replacement schedule', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ stripeScheduleId: 'sub_sched_2', scheduledQuantity: 3 }),
			);

			await service.handleScheduleEvent(stripeSchedule({ id: 'sub_sched_1' }), { cleared: true });

			expect(mockRepository.clearScheduledQuantity).not.toHaveBeenCalled();
		});

		it('should ignore a schedule that belongs to no add-on', async () => {
			// The Stripe portal creates schedules for the Pro subscription too.
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);
			mockRepository.findByStripeScheduleId.mockResolvedValue(undefined);

			await service.handleScheduleEvent(stripeSchedule({ subscription: 'sub_pro_1' }), {
				cleared: false,
			});

			expect(mockRepository.setScheduledQuantity).not.toHaveBeenCalled();
			expect(mockRepository.clearScheduledQuantity).not.toHaveBeenCalled();
		});

		it('should not write lastStripeEventAt from a schedule event', async () => {
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(storedAddon());

			await service.handleScheduleEvent(stripeSchedule(), { cleared: false });

			// Bumping it here would start dropping genuine subscription events as stale.
			expect(mockRepository.upsertByUserAndType).not.toHaveBeenCalled();
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

		it('should treat a portal cancellation via cancel_at as ending at period end', async () => {
			// The Stripe customer portal writes a concrete `cancel_at` and leaves the flag on
			// false, so reading only the flag hid the cancellation from the customer entirely.
			mockRepository.findByStripeSubscriptionId.mockResolvedValue(
				storedAddon({ cancelAtPeriodEnd: false }),
			);

			await upsert(stripeSubscription({ cancelAtPeriodEnd: false, cancelAt: 1_900_000_000 }));

			expect(mockRepository.upsertByUserAndType).toHaveBeenCalledWith(
				expect.objectContaining({ cancelAtPeriodEnd: true }),
			);
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

			// The row is reused on re-purchase, so the schedule mirror has to go with it.
			expect(mockRepository.update).toHaveBeenCalledWith(existing, {
				status: 'canceled',
				cancelAtPeriodEnd: false,
				stripeScheduleId: null,
				scheduledQuantity: null,
				scheduledQuantityEffectiveAt: null,
			});
			expect(mockTransitionService.emitCanceled).toHaveBeenCalled();
		});
	});
});
