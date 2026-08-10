import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { ManageDomainAddonUseCase } from '../manage-domain-addon.use-case';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import type UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';
import type CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { type CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';
import { type EnforceCustomDomainLimitUseCase } from '../enforce-custom-domain-limit.use-case';
import { type StripeService } from '../../service/stripe.service';
import { type TUserAddonSubscription } from '../../domain/entities/user-addon-subscription.entity';
import { type TUserSubscription } from '../../domain/entities/user-subscription.entity';
import { type Logger } from '@/core/logging';
import { ForbiddenError, NotFoundError, PaymentRequiredError } from '@/core/error/http';
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
		pendingQuantity: null,
		pendingQuantityEffectiveAt: null,
		currentPeriodEnd: PERIOD_END,
		cancelAtPeriodEnd: false,
		...overrides,
	}) as TUserAddonSubscription;

describe('ManageDomainAddonUseCase', () => {
	let useCase: ManageDomainAddonUseCase;
	let mockSubscriptionRepository: MockProxy<UserSubscriptionRepository>;
	let mockAddonRepository: MockProxy<UserAddonSubscriptionRepository>;
	let mockCustomDomainRepository: MockProxy<CustomDomainRepository>;
	let mockEntitlementService: MockProxy<CustomDomainEntitlementService>;
	let mockEnforce: MockProxy<EnforceCustomDomainLimitUseCase>;
	let mockStripeService: MockProxy<StripeService>;
	let mockLogger: MockProxy<Logger>;

	beforeEach(() => {
		mockSubscriptionRepository = mock<UserSubscriptionRepository>();
		mockAddonRepository = mock<UserAddonSubscriptionRepository>();
		mockCustomDomainRepository = mock<CustomDomainRepository>();
		mockEntitlementService = mock<CustomDomainEntitlementService>();
		mockEnforce = mock<EnforceCustomDomainLimitUseCase>();
		mockStripeService = mock<StripeService>();
		mockLogger = mock<Logger>();

		useCase = new ManageDomainAddonUseCase(
			mockSubscriptionRepository,
			mockAddonRepository,
			mockCustomDomainRepository,
			mockEntitlementService,
			mockEnforce,
			mockStripeService,
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
		mockStripeService.updateSubscriptionQuantity.mockResolvedValue({
			subscription: {} as Stripe.Subscription,
			paymentPending: false,
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

	describe('increase', () => {
		it('should charge immediately and grant the slots', async () => {
			await useCase.updateQuantity(USER_ID, 6, { prorationDate: 1_700_000_000 });

			expect(mockStripeService.updateSubscriptionQuantity).toHaveBeenCalledWith({
				subscriptionId: 'sub_addon_1',
				quantity: 6,
				billing: 'charge_now',
				prorationDate: 1_700_000_000,
			});
			expect(mockAddonRepository.update).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ quantity: 6, pendingQuantity: null }),
			);
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

		it('should restore the paid-for quantity before charging when a reduction is pending', async () => {
			mockAddonRepository.findByUserAndType.mockResolvedValue(
				addonRow({ quantity: 4, pendingQuantity: 2, pendingQuantityEffectiveAt: PERIOD_END }),
			);

			await useCase.updateQuantity(USER_ID, 6);

			// Without this reset Stripe would prorate from 2 and bill twice for two slots.
			expect(mockStripeService.resetSubscriptionQuantity).toHaveBeenCalledWith('sub_addon_1', 4);
			const resetOrder = mockStripeService.resetSubscriptionQuantity.mock.invocationCallOrder[0];
			const chargeOrder = mockStripeService.updateSubscriptionQuantity.mock.invocationCallOrder[0];
			expect(resetOrder).toBeLessThan(chargeOrder);
		});

		it('should do nothing when the quantity is unchanged', async () => {
			await useCase.updateQuantity(USER_ID, 4);

			expect(mockStripeService.updateSubscriptionQuantity).not.toHaveBeenCalled();
			expect(mockAddonRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('reduction', () => {
		it('should defer the reduction to the period end without charging', async () => {
			mockEnforce.execute.mockResolvedValue({
				effectiveLimit: 3,
				enabled: [],
				disabled: ['b.example.com'],
			});

			const result = await useCase.updateQuantity(USER_ID, 2);

			expect(mockStripeService.updateSubscriptionQuantity).toHaveBeenCalledWith(
				expect.objectContaining({ quantity: 2, billing: 'defer' }),
			);
			expect(mockAddonRepository.schedulePendingQuantity).toHaveBeenCalledWith(
				expect.anything(),
				2,
				PERIOD_END,
			);
			expect(result).toMatchObject({
				quantity: 4,
				pendingQuantity: 2,
				effectiveAt: PERIOD_END,
				willDisable: ['b.example.com'],
			});
		});
	});

	describe('preview', () => {
		it('should quote the Stripe amount for an increase', async () => {
			mockStripeService.previewQuantityChange.mockResolvedValue({
				amountDue: 8073,
				currency: 'eur',
				prorationDate: 1_700_000_000,
			});
			mockStripeService.getSubscriptionPaymentMethod.mockResolvedValue({
				brand: 'visa',
				last4: '4242',
			});

			const preview = await useCase.previewQuantityChange(USER_ID, 6);

			expect(preview).toMatchObject({
				amountDueNow: 8073,
				currency: 'eur',
				prorationDate: 1_700_000_000,
				effectiveAt: null,
				requiresPendingReset: false,
				paymentMethod: { brand: 'visa', last4: '4242' },
			});
		});

		it('should quote nothing for a reduction and name the affected domains', async () => {
			mockEnforce.execute.mockResolvedValue({
				effectiveLimit: 3,
				enabled: [],
				disabled: ['b.example.com'],
			});

			const preview = await useCase.previewQuantityChange(USER_ID, 2);

			expect(preview).toMatchObject({
				amountDueNow: 0,
				effectiveAt: PERIOD_END,
				willDisable: ['b.example.com'],
			});
			expect(mockStripeService.previewQuantityChange).not.toHaveBeenCalled();
		});

		it('should ask for the pending reduction to be withdrawn before quoting an increase', async () => {
			mockAddonRepository.findByUserAndType.mockResolvedValue(
				addonRow({ quantity: 4, pendingQuantity: 2, pendingQuantityEffectiveAt: PERIOD_END }),
			);

			const preview = await useCase.previewQuantityChange(USER_ID, 6);

			expect(preview.requiresPendingReset).toBe(true);
			// Quoting from Stripe's reduced quantity would show a higher amount than is really due.
			expect(mockStripeService.previewQuantityChange).not.toHaveBeenCalled();
		});
	});

	describe('withdrawing a pending reduction', () => {
		it('should reset Stripe to the paid-for quantity at no cost', async () => {
			mockAddonRepository.findByUserAndType.mockResolvedValue(
				addonRow({ quantity: 4, pendingQuantity: 2, pendingQuantityEffectiveAt: PERIOD_END }),
			);

			await useCase.cancelPendingReduction(USER_ID);

			expect(mockStripeService.resetSubscriptionQuantity).toHaveBeenCalledWith('sub_addon_1', 4);
			expect(mockAddonRepository.clearPendingQuantity).toHaveBeenCalled();
		});

		it('should do nothing when no reduction is pending', async () => {
			await useCase.cancelPendingReduction(USER_ID);

			expect(mockStripeService.resetSubscriptionQuantity).not.toHaveBeenCalled();
		});
	});
});
