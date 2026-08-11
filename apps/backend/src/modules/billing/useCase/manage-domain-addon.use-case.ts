import { inject, injectable } from 'tsyringe';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	PaymentRequiredError,
} from '@/core/error/http';
import { CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { type TCreateDomainAddonCheckoutDto } from '@shared/schemas';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { type TUserAddonSubscription } from '../domain/entities/user-addon-subscription.entity';
import { type TUserSubscription } from '../domain/entities/user-subscription.entity';
import { StripeService, type TAddonSubscriptionState } from '../service/stripe.service';
import { AddonSubscriptionStatusTransitionService } from '../service/addon-subscription-status-transition.service';
import { ADDON_DOMAIN_PRICE_IDS } from '../config/stripe-prices';
import {
	DOMAIN_ADDON_PRODUCT,
	SUBSCRIPTION_PRODUCT_METADATA_KEY,
} from '../service/subscription-product.resolver';
import { EnforceCustomDomainLimitUseCase } from './enforce-custom-domain-limit.use-case';
import { isAllowedRedirect } from '../http/redirect-guard';

const ENTITLING_STATUSES = new Set(['active', 'trialing']);

export type TDomainAddonOverview = {
	addon: TUserAddonSubscription | null;
	entitlement: { baseLimit: number; addonSlots: number; effectiveLimit: number };
	usedDomains: number;
};

export type TDomainAddonQuantityChange = {
	/** Slots the user is entitled to right now. Unchanged by a reduction. */
	quantity: number;
	/** Set while a lower quantity is parked for the end of the period. */
	scheduledQuantity: number | null;
	/** When `scheduledQuantity` takes over, or when a cancellation takes effect. */
	effectiveAt: Date | null;
	/** Domain names that lose their slot when the change takes effect. */
	willDisable: string[];
};

export type TDomainAddonQuantityPreview = {
	quantity: number;
	currentQuantity: number;
	scheduledQuantity: number | null;
	/** Whether the change is billed now or only takes effect at the end of the period. */
	mode: 'immediate' | 'scheduled';
	/** In minor units. Always 0 for a reduction — nothing is ever credited back. */
	amountDueNow: number;
	currency: string;
	/** Feed back into `updateQuantity` so the charge equals the quote. Null when nothing is due. */
	prorationDate: number | null;
	periodEnd: Date;
	/** When the change would take effect; null when it is immediate. */
	effectiveAt: Date | null;
	willDisable: string[];
	paymentMethod: { brand: string; last4: string } | null;
};

/**
 * Everything a user can do with the extra-custom-domains add-on.
 *
 * An active Pro plan is a hard prerequisite. The billing rule is asymmetric on purpose:
 * an increase applies at once and Stripe invoices the prorated difference, while a reduction is
 * parked in a subscription schedule and only takes over when the paid period ends. Nothing is
 * ever refunded or credited, so the customer keeps every slot they paid for — and the domains
 * stay live until Stripe actually switches the quantity. Cancelling the add-on works the same
 * way: it runs to the end of the period and then drops to the plan's own allowance.
 */
@injectable()
export class ManageDomainAddonUseCase {
	constructor(
		@inject(UserSubscriptionRepository)
		private userSubscriptionRepository: UserSubscriptionRepository,
		@inject(UserAddonSubscriptionRepository)
		private addonSubscriptionRepository: UserAddonSubscriptionRepository,
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(CustomDomainEntitlementService)
		private entitlementService: CustomDomainEntitlementService,
		@inject(EnforceCustomDomainLimitUseCase)
		private enforceCustomDomainLimitUseCase: EnforceCustomDomainLimitUseCase,
		@inject(StripeService) private stripeService: StripeService,
		@inject(AddonSubscriptionStatusTransitionService)
		private transitionService: AddonSubscriptionStatusTransitionService,
		@inject(Logger) private logger: Logger,
	) {}

	async getOverview(userId: string): Promise<TDomainAddonOverview> {
		const [addon, entitlement, usedDomains] = await Promise.all([
			this.addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain'),
			this.entitlementService.getCustomDomainLimit(userId),
			this.customDomainRepository.countByUserId(userId),
		]);

		return {
			addon: addon && addon.status !== 'canceled' ? addon : null,
			entitlement,
			usedDomains,
		};
	}

	async createCheckoutSession(
		userId: string,
		dto: TCreateDomainAddonCheckoutDto,
	): Promise<{ url: string }> {
		if (!ADDON_DOMAIN_PRICE_IDS.has(dto.priceId)) {
			throw new BadRequestError('Invalid price ID');
		}
		if (!isAllowedRedirect(dto.successUrl) || !isAllowedRedirect(dto.cancelUrl)) {
			throw new BadRequestError('Invalid redirect URL');
		}

		const pro = await this.requireActivePro(userId);

		const existing = await this.addonSubscriptionRepository.findByUserAndType(
			userId,
			'custom_domain',
		);
		if (existing && existing.status !== 'canceled') {
			throw new ConflictError(
				'You already have extra domains. Change how many you have instead of buying again.',
			);
		}

		const session = await this.stripeService.createCheckoutSession({
			// Pro is required, so the customer already exists — no need to look it up in Stripe.
			customerId: pro.stripeCustomerId,
			priceId: dto.priceId,
			quantity: dto.quantity,
			userId,
			locale: dto.locale,
			metadata: { [SUBSCRIPTION_PRODUCT_METADATA_KEY]: DOMAIN_ADDON_PRODUCT },
			successUrl:
				dto.successUrl ?? `${env.FRONTEND_URL}/dashboard/settings/domains?checkout=success`,
			cancelUrl: dto.cancelUrl ?? `${env.FRONTEND_URL}/dashboard/settings/domains`,
		});

		if (!session.url) {
			throw new BadRequestError('Stripe did not return a checkout URL');
		}

		this.logger.info('domainAddon.checkoutStarted', {
			subscription: { userId, quantity: dto.quantity },
		});

		return { url: session.url };
	}

	/**
	 * Quotes a quantity change without applying it.
	 *
	 * Only an increase costs anything, and its amount comes from Stripe. The returned
	 * `prorationDate` is fed back into {@link updateQuantity} so the charge matches the quote
	 * exactly — Stripe prorates to the second, so a preview taken a minute earlier would
	 * otherwise be a few cents off. A reduction is quoted locally as zero: it buys nothing today
	 * and never produces a credit, so there is nothing for Stripe to compute.
	 */
	async previewQuantityChange(
		userId: string,
		quantity: number,
	): Promise<TDomainAddonQuantityPreview> {
		await this.requireActivePro(userId);
		const addon = await this.requireActiveAddon(userId);
		const state = await this.stripeService.getAddonSubscriptionState(addon.stripeSubscriptionId);

		const base = {
			quantity,
			currentQuantity: state.quantity,
			scheduledQuantity: addon.scheduledQuantity,
			periodEnd: state.currentPeriodEnd,
		};

		if (quantity > state.quantity) {
			const [preview, paymentMethod] = await Promise.all([
				this.stripeService.previewQuantityChange({
					subscriptionId: addon.stripeSubscriptionId,
					quantity,
				}),
				this.stripeService.getSubscriptionPaymentMethod(addon.stripeSubscriptionId),
			]);

			return {
				...base,
				mode: 'immediate',
				amountDueNow: preview.amountDue,
				currency: preview.currency,
				prorationDate: preview.prorationDate,
				effectiveAt: null,
				willDisable: [],
				paymentMethod,
			};
		}

		return {
			...base,
			mode: 'scheduled',
			amountDueNow: 0,
			// Nothing is due, but the field still has to name a real currency: a client that
			// formats the amount unconditionally would throw on an empty one.
			currency: state.currency,
			prorationDate: null,
			effectiveAt: quantity < state.quantity ? state.currentPeriodEnd : null,
			willDisable:
				quantity < state.quantity ? await this.projectDisabledDomains(userId, quantity) : [],
			paymentMethod: null,
		};
	}

	/**
	 * Moves the slot count to `quantity`, immediately or at the end of the period.
	 *
	 * The direction is decided against what Stripe is billing right now, never against a pending
	 * reduction. That single comparison covers every sequence the user can produce: raising the
	 * count after scheduling a reduction simply drops the reduction, lowering it twice replaces
	 * the parked value, and asking for the quantity already in force withdraws a pending
	 * reduction altogether.
	 */
	async updateQuantity(
		userId: string,
		quantity: number,
		options: { prorationDate?: number } = {},
	): Promise<TDomainAddonQuantityChange> {
		await this.requireActivePro(userId);
		const addon = await this.requireActiveAddon(userId);
		const state = await this.stripeService.getAddonSubscriptionState(addon.stripeSubscriptionId);

		if (state.cancelAtPeriodEnd && quantity !== state.quantity) {
			throw new ConflictError(
				'The extra domains are already set to end when the period does. Reactivate them before changing how many you have.',
			);
		}

		if (quantity > state.quantity) {
			return this.applyIncrease(userId, addon, state, quantity, options.prorationDate);
		}

		if (quantity < state.quantity) {
			return this.scheduleReduction(userId, addon, state, quantity);
		}

		return this.withdrawScheduledReduction(userId, addon, state);
	}

	/**
	 * Drops a parked reduction so the current slot count simply continues.
	 *
	 * Its own endpoint because the dialog offers it as "keep what I have", where there is no new
	 * quantity to send — {@link updateQuantity} would need the caller to echo back the number it
	 * is already on.
	 */
	async cancelScheduledReduction(userId: string): Promise<TDomainAddonQuantityChange> {
		await this.requireActivePro(userId);
		const addon = await this.requireActiveAddon(userId);
		const state = await this.stripeService.getAddonSubscriptionState(addon.stripeSubscriptionId);

		return this.withdrawScheduledReduction(userId, addon, state);
	}

	async cancel(userId: string): Promise<TDomainAddonQuantityChange & { cancelAtPeriodEnd: true }> {
		const addon = await this.requireActiveAddon(userId);

		if (!addon.cancelAtPeriodEnd) {
			// A schedule-managed subscription rejects cancellation changes outright, and the parked
			// reduction is moot anyway once everything ends on the same date.
			await this.releaseSchedule(addon);
			await this.stripeService.setCancelAtPeriodEnd(addon.stripeSubscriptionId, true);
			await this.addonSubscriptionRepository.update(addon, { cancelAtPeriodEnd: true });
		}

		const willDisable = await this.projectDisabledDomains(userId, 0);

		this.logger.info('domainAddon.cancelScheduled', {
			subscription: { userId, effectiveAt: addon.currentPeriodEnd.toISOString() },
		});

		return {
			cancelAtPeriodEnd: true,
			quantity: addon.quantity,
			scheduledQuantity: null,
			effectiveAt: addon.currentPeriodEnd,
			willDisable,
		};
	}

	async reactivate(userId: string): Promise<{ cancelAtPeriodEnd: false }> {
		await this.requireActivePro(userId);
		const addon = await this.requireActiveAddon(userId);

		if (addon.cancelAtPeriodEnd) {
			// Defensive: the Stripe portal can attach a schedule we never created, and that would
			// make the cancellation change below fail.
			await this.releaseSchedule(addon);
			await this.stripeService.setCancelAtPeriodEnd(addon.stripeSubscriptionId, false);
			await this.addonSubscriptionRepository.update(addon, { cancelAtPeriodEnd: false });
		}

		this.logger.info('domainAddon.reactivated', { subscription: { userId } });

		return { cancelAtPeriodEnd: false };
	}

	/** Bills the difference for the rest of the period and hands over the slots at once. */
	private async applyIncrease(
		userId: string,
		addon: TUserAddonSubscription,
		state: TAddonSubscriptionState,
		quantity: number,
		prorationDate?: number,
	): Promise<TDomainAddonQuantityChange> {
		// A parked reduction would otherwise overwrite the new count at the next renewal, and
		// Stripe would reject the item update while the schedule owns the subscription.
		if (state.scheduleId) {
			await this.stripeService.releaseSchedule(state.scheduleId);
		}

		const { paymentPending } = await this.stripeService.updateSubscriptionQuantity({
			subscriptionId: addon.stripeSubscriptionId,
			quantity,
			prorationDate,
		});

		// Stripe parks the change instead of applying it when the card declines. Granting the slots
		// locally now would hand out what was never paid for.
		if (paymentPending) {
			this.logger.warn('domainAddon.quantityChangePaymentFailed', {
				subscription: { userId, quantity, previousQuantity: state.quantity },
			});
			throw new PaymentRequiredError(
				'The payment for the additional domains could not be collected. Please check your payment method and try again.',
			);
		}

		await this.addonSubscriptionRepository.update(addon, {
			quantity,
			stripeScheduleId: null,
			scheduledQuantity: null,
			scheduledQuantityEffectiveAt: null,
		});
		const { disabled } = await this.enforceCustomDomainLimitUseCase.execute(userId);

		this.logger.info('domainAddon.quantityIncreased', {
			subscription: { userId, previousQuantity: state.quantity, quantity },
		});

		return { quantity, scheduledQuantity: null, effectiveAt: null, willDisable: disabled };
	}

	/**
	 * Parks a lower count for the end of the period.
	 *
	 * Deliberately does not enforce the domain limit: the user paid through to the period end and
	 * keeps every slot until Stripe switches the quantity, at which point the webhook enforces it.
	 * The reported domains are therefore a projection of what would go dark on that date.
	 */
	private async scheduleReduction(
		userId: string,
		addon: TUserAddonSubscription,
		state: TAddonSubscriptionState,
		quantity: number,
	): Promise<TDomainAddonQuantityChange> {
		const { scheduleId, effectiveAt } = await this.stripeService.scheduleQuantityAtPeriodEnd({
			state,
			quantity,
		});

		await this.addonSubscriptionRepository.setScheduledQuantity(addon, {
			stripeScheduleId: scheduleId,
			quantity,
			effectiveAt,
		});

		const willDisable = await this.projectDisabledDomains(userId, quantity);

		await this.transitionService.emitReductionScheduled({
			userId,
			stripeSubscriptionId: addon.stripeSubscriptionId,
			quantity: state.quantity,
			scheduledQuantity: quantity,
			effectiveAt,
		});

		this.logger.info('domainAddon.reductionScheduled', {
			subscription: {
				userId,
				quantity: state.quantity,
				scheduledQuantity: quantity,
				effectiveAt: effectiveAt.toISOString(),
			},
		});

		return {
			quantity: state.quantity,
			scheduledQuantity: quantity,
			effectiveAt,
			willDisable,
		};
	}

	private async withdrawScheduledReduction(
		userId: string,
		addon: TUserAddonSubscription,
		state: TAddonSubscriptionState,
	): Promise<TDomainAddonQuantityChange> {
		const unchanged: TDomainAddonQuantityChange = {
			quantity: state.quantity,
			scheduledQuantity: null,
			effectiveAt: null,
			willDisable: [],
		};

		if (!state.scheduleId && addon.scheduledQuantity === null) return unchanged;

		if (state.scheduleId) {
			await this.stripeService.releaseSchedule(state.scheduleId);
		}
		await this.addonSubscriptionRepository.clearScheduledQuantity(addon);

		this.logger.info('domainAddon.reductionWithdrawn', {
			subscription: { userId, quantity: state.quantity },
		});

		return unchanged;
	}

	/** Detaches whatever schedule Stripe currently has on the add-on, if any. */
	private async releaseSchedule(addon: TUserAddonSubscription): Promise<void> {
		const state = await this.stripeService.getAddonSubscriptionState(addon.stripeSubscriptionId);
		if (!state.scheduleId) return;

		await this.stripeService.releaseSchedule(state.scheduleId);
		await this.addonSubscriptionRepository.clearScheduledQuantity(addon);
	}

	/**
	 * Asks the real enforcement code what it would switch off at the future slot count, so the
	 * warning shown before confirming names exactly the domains that will later go dark.
	 */
	private async projectDisabledDomains(userId: string, addonSlots: number): Promise<string[]> {
		const { baseLimit } = await this.entitlementService.getCustomDomainLimit(userId);
		const { disabled } = await this.enforceCustomDomainLimitUseCase.execute(userId, {
			dryRun: true,
			overrideLimit: baseLimit + addonSlots,
		});
		return disabled;
	}

	private async requireActivePro(userId: string): Promise<TUserSubscription> {
		const subscription = await this.userSubscriptionRepository.findByUserId(userId);

		if (!subscription || !ENTITLING_STATUSES.has(subscription.status)) {
			throw new ForbiddenError(
				'An active Pro subscription is required to buy extra custom domains.',
			);
		}

		return subscription;
	}

	private async requireActiveAddon(userId: string): Promise<TUserAddonSubscription> {
		const addon = await this.addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain');

		if (!addon || addon.status === 'canceled') {
			throw new NotFoundError('You have no extra domains to manage.');
		}

		return addon;
	}
}
