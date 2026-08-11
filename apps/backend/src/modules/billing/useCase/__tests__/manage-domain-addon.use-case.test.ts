import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { ManageDomainAddonUseCase } from '../manage-domain-addon.use-case';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import type UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';
import type CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { type CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';
import { type EnforceCustomDomainLimitUseCase } from '../enforce-custom-domain-limit.use-case';
import { type StripeService, type TAddonSubscriptionState } from '../../service/stripe.service';
import { type AddonSubscriptionStatusTransitionService } from '../../service/addon-subscription-status-transition.service';
import { type TUserAddonSubscription } from '../../domain/entities/user-addon-subscription.entity';
import { type TUserSubscription } from '../../domain/entities/user-subscription.entity';
import { type Logger } from '@/core/logging';
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	PaymentRequiredError,
} from '@/core/error/http';
import type Stripe from 'stripe';

const USER_ID = 'user-123';
const PERIOD_END = new Date('2027-01-01T00:00:00Z');

const addonRow = (overrides: Partial<TUserAddonSubscription> = {}): TUserAddonSubscription =>
	({
		id: 'row-1',
		userId: USER_ID,
		addonType: 'custom_domain',
		stripeSubscriptionId: 'sub_addon_1',
		stripePriceId: 'price_addon',
		status: 'active',
		quantity: 4,
		currentPeriodEnd: PERIOD_END,
		cancelAtPeriodEnd: false,
		stripeScheduleId: null,
		scheduledQuantity: null,
		scheduledQuantityEffectiveAt: null,
		...overrides,
	}) as TUserAddonSubscription;

/** What Stripe reports right now — the only thing the direction of a change is decided on. */
const stripeState = (
	overrides: Partial<TAddonSubscriptionState> = {},
): TAddonSubscriptionState => ({
	subscriptionId: 'sub_addon_1',
	itemId: 'si_1',
	priceId: 'price_addon',
	quantity: 4,
	currency: 'eur',
	currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
	currentPeriodEnd: PERIOD_END,
	cancelAtPeriodEnd: false,
	scheduleId: null,
	interval: 'month',
	intervalCount: 1,
	...overrides,
});

describe('ManageDomainAddonUseCase', () => {
	let useCase: ManageDomainAddonUseCase;
	let mockSubscriptionRepository: MockProxy<UserSubscriptionRepository>;
	let mockAddonRepository: MockProxy<UserAddonSubscriptionRepository>;
	let mockCustomDomainRepository: MockProxy<CustomDomainRepository>;
	let mockEntitlementService: MockProxy<CustomDomainEntitlementService>;
	let mockEnforce: MockProxy<EnforceCustomDomainLimitUseCase>;
	let mockStripeService: MockProxy<StripeService>;
	let mockTransitionService: MockProxy<AddonSubscriptionStatusTransitionService>;
	let mockLogger: MockProxy<Logger>;

	beforeEach(() => {
		mockSubscriptionRepository = mock<UserSubscriptionRepository>();
		mockAddonRepository = mock<UserAddonSubscriptionRepository>();
		mockCustomDomainRepository = mock<CustomDomainRepository>();
		mockEntitlementService = mock<CustomDomainEntitlementService>();
		mockEnforce = mock<EnforceCustomDomainLimitUseCase>();
		mockStripeService = mock<StripeService>();
		mockTransitionService = mock<AddonSubscriptionStatusTransitionService>();
		mockLogger = mock<Logger>();

		useCase = new ManageDomainAddonUseCase(
			mockSubscriptionRepository,
			mockAddonRepository,
			mockCustomDomainRepository,
			mockEntitlementService,
			mockEnforce,
			mockStripeService,
			mockTransitionService,
			mockLogger,
		);

		mockSubscriptionRepository.findByUserId.mockResolvedValue({
			userId: USER_ID,
			status: 'active',
			stripeCustomerId: 'cus_1',
		} as TUserSubscription);
		mockAddonRepository.findByUserAndType.mockResolvedValue(addonRow());
		mockEntitlementService.getCustomDomainLimit.mockResolvedValue({
			baseLimit: 1,
			addonSlots: 4,
			effectiveLimit: 5,
		});
		mockEnforce.execute.mockResolvedValue({ effectiveLimit: 5, enabled: [], disabled: [] });
		mockStripeService.getAddonSubscriptionState.mockResolvedValue(stripeState());
		mockStripeService.updateSubscriptionQuantity.mockResolvedValue({
			subscription: {} as Stripe.Subscription,
			paymentPending: false,
		});
		mockStripeService.scheduleQuantityAtPeriodEnd.mockResolvedValue({
			scheduleId: 'sub_sched_1',
			effectiveAt: PERIOD_END,
		});
	});

	afterEach(() => jest.clearAllMocks());

	describe('access', () => {
		it('should refuse without an active Pro plan', async () => {
			mockSubscriptionRepository.findByUserId.mockResolvedValue({
				status: 'canceled',
			} as TUserSubscription);

			await expect(useCase.updateQuantity(USER_ID, 5)).rejects.toThrow(ForbiddenError);
			expect(mockStripeService.updateSubscriptionQuantity).not.toHaveBeenCalled();
		});

		it('should refuse when there is no add-on', async () => {
			mockAddonRepository.findByUserAndType.mockResolvedValue(undefined);

			await expect(useCase.updateQuantity(USER_ID, 5)).rejects.toThrow(NotFoundError);
		});
	});

	describe('quantity changes', () => {
		it('should charge immediately and grant the slots on an increase', async () => {
			await useCase.updateQuantity(USER_ID, 6, { prorationDate: 1_700_000_000 });

			expect(mockStripeService.updateSubscriptionQuantity).toHaveBeenCalledWith({
				subscriptionId: 'sub_addon_1',
				quantity: 6,
				prorationDate: 1_700_000_000,
			});
			expect(mockAddonRepository.update).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ quantity: 6 }),
			);
		});

		it('should defer a reduction to the end of the period instead of applying it', async () => {
			mockEnforce.execute.mockResolvedValue({
				effectiveLimit: 3,
				enabled: [],
				disabled: ['b.example.com'],
			});

			const result = await useCase.updateQuantity(USER_ID, 2);

			// The subscription itself must not be touched: that would prorate a credit, and this
			// product never refunds.
			expect(mockStripeService.updateSubscriptionQuantity).not.toHaveBeenCalled();
			expect(mockStripeService.scheduleQuantityAtPeriodEnd).toHaveBeenCalledWith({
				state: expect.objectContaining({ quantity: 4 }),
				quantity: 2,
			});
			expect(mockAddonRepository.setScheduledQuantity).toHaveBeenCalledWith(expect.anything(), {
				stripeScheduleId: 'sub_sched_1',
				quantity: 2,
				effectiveAt: PERIOD_END,
			});
			expect(result).toMatchObject({
				quantity: 4,
				scheduledQuantity: 2,
				effectiveAt: PERIOD_END,
				willDisable: ['b.example.com'],
			});
		});

		it('should keep the domains live until a scheduled reduction takes effect', async () => {
			await useCase.updateQuantity(USER_ID, 2);

			// Only the dry run that names the doomed domains may run — nothing may be switched off.
			expect(mockEnforce.execute).not.toHaveBeenCalledWith(USER_ID);
			expect(mockEnforce.execute).toHaveBeenCalledWith(
				USER_ID,
				expect.objectContaining({ dryRun: true }),
			);
		});

		it('should announce a scheduled reduction by email', async () => {
			await useCase.updateQuantity(USER_ID, 2);

			expect(mockTransitionService.emitReductionScheduled).toHaveBeenCalledWith({
				userId: USER_ID,
				stripeSubscriptionId: 'sub_addon_1',
				quantity: 4,
				scheduledQuantity: 2,
				effectiveAt: PERIOD_END,
			});
		});

		it('should drop a parked reduction when the quantity is raised again', async () => {
			mockStripeService.getAddonSubscriptionState.mockResolvedValue(
				stripeState({ scheduleId: 'sub_sched_1' }),
			);
			mockAddonRepository.findByUserAndType.mockResolvedValue(
				addonRow({ stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);

			const result = await useCase.updateQuantity(USER_ID, 8);

			expect(mockStripeService.releaseSchedule).toHaveBeenCalledWith('sub_sched_1');
			expect(mockStripeService.updateSubscriptionQuantity).toHaveBeenCalledWith(
				expect.objectContaining({ quantity: 8 }),
			);
			expect(mockAddonRepository.update).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ quantity: 8, scheduledQuantity: null }),
			);
			expect(result.scheduledQuantity).toBeNull();
		});

		it('should replace a parked reduction rather than stack a second one', async () => {
			mockStripeService.getAddonSubscriptionState.mockResolvedValue(
				stripeState({ scheduleId: 'sub_sched_1' }),
			);
			mockAddonRepository.findByUserAndType.mockResolvedValue(
				addonRow({ stripeScheduleId: 'sub_sched_1', scheduledQuantity: 3 }),
			);

			const result = await useCase.updateQuantity(USER_ID, 2);

			expect(mockStripeService.scheduleQuantityAtPeriodEnd).toHaveBeenCalledWith(
				expect.objectContaining({ quantity: 2 }),
			);
			expect(result).toMatchObject({ quantity: 4, scheduledQuantity: 2 });
		});

		it('should refuse a change once the add-on is set to end', async () => {
			mockStripeService.getAddonSubscriptionState.mockResolvedValue(
				stripeState({ cancelAtPeriodEnd: true }),
			);

			await expect(useCase.updateQuantity(USER_ID, 6)).rejects.toThrow(ConflictError);
			expect(mockStripeService.updateSubscriptionQuantity).not.toHaveBeenCalled();
		});

		it('should bring the domains in line after an increase', async () => {
			await useCase.updateQuantity(USER_ID, 6);

			expect(mockEnforce.execute).toHaveBeenCalledWith(USER_ID);
		});

		it('should not grant slots when the payment could not be collected', async () => {
			mockStripeService.updateSubscriptionQuantity.mockResolvedValue({
				subscription: {} as Stripe.Subscription,
				paymentPending: true,
			});

			await expect(useCase.updateQuantity(USER_ID, 6)).rejects.toThrow(PaymentRequiredError);
			expect(mockAddonRepository.update).not.toHaveBeenCalled();
			expect(mockEnforce.execute).not.toHaveBeenCalled();
		});

		it('should do nothing when the quantity is unchanged and nothing is parked', async () => {
			await useCase.updateQuantity(USER_ID, 4);

			expect(mockStripeService.updateSubscriptionQuantity).not.toHaveBeenCalled();
			expect(mockStripeService.scheduleQuantityAtPeriodEnd).not.toHaveBeenCalled();
			expect(mockStripeService.releaseSchedule).not.toHaveBeenCalled();
			expect(mockAddonRepository.update).not.toHaveBeenCalled();
		});

		it('should withdraw a parked reduction when the current quantity is confirmed', async () => {
			mockStripeService.getAddonSubscriptionState.mockResolvedValue(
				stripeState({ scheduleId: 'sub_sched_1' }),
			);
			mockAddonRepository.findByUserAndType.mockResolvedValue(
				addonRow({ stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);

			const result = await useCase.updateQuantity(USER_ID, 4);

			expect(mockStripeService.releaseSchedule).toHaveBeenCalledWith('sub_sched_1');
			expect(mockAddonRepository.clearScheduledQuantity).toHaveBeenCalled();
			expect(mockStripeService.updateSubscriptionQuantity).not.toHaveBeenCalled();
			expect(result).toMatchObject({ quantity: 4, scheduledQuantity: null, effectiveAt: null });
		});
	});

	describe('cancellation', () => {
		it('should release a parked reduction before setting cancel-at-period-end', async () => {
			// Stripe rejects cancellation changes while a schedule owns the subscription.
			mockStripeService.getAddonSubscriptionState.mockResolvedValue(
				stripeState({ scheduleId: 'sub_sched_1' }),
			);
			mockAddonRepository.findByUserAndType.mockResolvedValue(
				addonRow({ stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);

			await useCase.cancel(USER_ID);

			expect(mockStripeService.releaseSchedule).toHaveBeenCalledWith('sub_sched_1');
			expect(mockStripeService.setCancelAtPeriodEnd).toHaveBeenCalledWith('sub_addon_1', true);
			const releaseOrder = mockStripeService.releaseSchedule.mock.invocationCallOrder[0];
			const cancelOrder = mockStripeService.setCancelAtPeriodEnd.mock.invocationCallOrder[0];
			expect(releaseOrder).toBeLessThan(cancelOrder);
		});

		it('should report the domains that lapse with the add-on', async () => {
			mockEnforce.execute.mockResolvedValue({
				effectiveLimit: 1,
				enabled: [],
				disabled: ['a.example.com'],
			});

			const result = await useCase.cancel(USER_ID);

			expect(result).toMatchObject({
				cancelAtPeriodEnd: true,
				effectiveAt: PERIOD_END,
				willDisable: ['a.example.com'],
			});
		});
	});

	describe('preview', () => {
		beforeEach(() => {
			mockStripeService.previewQuantityChange.mockResolvedValue({
				amountDue: 8073,
				currency: 'eur',
				prorationDate: 1_700_000_000,
			});
			mockStripeService.getSubscriptionPaymentMethod.mockResolvedValue({
				brand: 'visa',
				last4: '4242',
			});
		});

		it('should quote the charge for an increase', async () => {
			const preview = await useCase.previewQuantityChange(USER_ID, 6);

			expect(preview).toMatchObject({
				mode: 'immediate',
				amountDueNow: 8073,
				currency: 'eur',
				prorationDate: 1_700_000_000,
				paymentMethod: { brand: 'visa', last4: '4242' },
				effectiveAt: null,
				willDisable: [],
			});
		});

		it('should quote a reduction as free and name the domains it would cost', async () => {
			mockEnforce.execute.mockResolvedValue({
				effectiveLimit: 3,
				enabled: [],
				disabled: ['b.example.com'],
			});

			const preview = await useCase.previewQuantityChange(USER_ID, 2);

			// Nothing is charged and nothing is credited, so there is no Stripe amount to fetch.
			expect(mockStripeService.previewQuantityChange).not.toHaveBeenCalled();
			expect(preview).toMatchObject({
				mode: 'scheduled',
				amountDueNow: 0,
				prorationDate: null,
				effectiveAt: PERIOD_END,
				willDisable: ['b.example.com'],
			});
		});

		it('should quote withdrawing a parked reduction as free and immediate', async () => {
			mockAddonRepository.findByUserAndType.mockResolvedValue(
				addonRow({ stripeScheduleId: 'sub_sched_1', scheduledQuantity: 2 }),
			);

			const preview = await useCase.previewQuantityChange(USER_ID, 4);

			expect(preview).toMatchObject({
				mode: 'scheduled',
				amountDueNow: 0,
				scheduledQuantity: 2,
				effectiveAt: null,
				willDisable: [],
			});
		});

		it('should not change anything while quoting', async () => {
			await useCase.previewQuantityChange(USER_ID, 6);

			expect(mockStripeService.updateSubscriptionQuantity).not.toHaveBeenCalled();
			expect(mockStripeService.scheduleQuantityAtPeriodEnd).not.toHaveBeenCalled();
			expect(mockAddonRepository.update).not.toHaveBeenCalled();
		});
	});
});
