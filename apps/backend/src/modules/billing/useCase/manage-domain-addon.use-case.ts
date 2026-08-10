import { inject, injectable } from 'tsyringe';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@/core/error/http';
import { CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { type TCreateDomainAddonCheckoutDto } from '@shared/schemas';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { type TUserAddonSubscription } from '../domain/entities/user-addon-subscription.entity';
import { type TUserSubscription } from '../domain/entities/user-subscription.entity';
import { StripeService } from '../service/stripe.service';
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
	quantity: number;
	pendingQuantity: number | null;
	effectiveAt: Date | null;
	willDisable: string[];
};

/**
 * Everything a user can do with the extra-custom-domains add-on.
 *
 * Two rules run through all of it: an active Pro plan is a hard prerequisite, and nothing is ever
 * refunded — increases bill immediately, reductions and cancellations take effect at the end of
 * the paid period and leave the slots usable until then.
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

	async updateQuantity(userId: string, quantity: number): Promise<TDomainAddonQuantityChange> {
		await this.requireActivePro(userId);
		const addon = await this.requireActiveAddon(userId);

		if (quantity >= addon.quantity) {
			return this.increaseQuantity(userId, addon, quantity);
		}
		return this.scheduleReduction(userId, addon, quantity);
	}

	async cancel(userId: string): Promise<TDomainAddonQuantityChange & { cancelAtPeriodEnd: true }> {
		const addon = await this.requireActiveAddon(userId);

		if (!addon.cancelAtPeriodEnd) {
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
			pendingQuantity: 0,
			effectiveAt: addon.currentPeriodEnd,
			willDisable,
		};
	}

	async reactivate(userId: string): Promise<{ cancelAtPeriodEnd: false }> {
		await this.requireActivePro(userId);
		const addon = await this.requireActiveAddon(userId);

		if (addon.cancelAtPeriodEnd) {
			await this.stripeService.setCancelAtPeriodEnd(addon.stripeSubscriptionId, false);
			await this.addonSubscriptionRepository.update(addon, { cancelAtPeriodEnd: false });
		}

		this.logger.info('domainAddon.reactivated', { subscription: { userId } });

		return { cancelAtPeriodEnd: false };
	}

	/** Takes effect now and is invoiced immediately, so the slots are usable straight away. */
	private async increaseQuantity(
		userId: string,
		addon: TUserAddonSubscription,
		quantity: number,
	): Promise<TDomainAddonQuantityChange> {
		if (quantity === addon.quantity && addon.pendingQuantity === null) {
			return { quantity, pendingQuantity: null, effectiveAt: null, willDisable: [] };
		}

		// Stripe first: a declined card throws here, before we grant anything locally.
		await this.stripeService.updateSubscriptionQuantity({
			subscriptionId: addon.stripeSubscriptionId,
			quantity,
			billing: 'charge_now',
		});

		await this.addonSubscriptionRepository.update(addon, {
			quantity,
			pendingQuantity: null,
			pendingQuantityEffectiveAt: null,
		});

		await this.enforceCustomDomainLimitUseCase.execute(userId);

		this.logger.info('domainAddon.quantityIncreased', {
			subscription: { userId, previousQuantity: addon.quantity, quantity },
		});

		return { quantity, pendingQuantity: null, effectiveAt: null, willDisable: [] };
	}

	/** Written to Stripe now but only effective at period end — the user keeps what they paid for. */
	private async scheduleReduction(
		userId: string,
		addon: TUserAddonSubscription,
		quantity: number,
	): Promise<TDomainAddonQuantityChange> {
		await this.stripeService.updateSubscriptionQuantity({
			subscriptionId: addon.stripeSubscriptionId,
			quantity,
			billing: 'defer',
		});

		await this.addonSubscriptionRepository.schedulePendingQuantity(
			addon,
			quantity,
			addon.currentPeriodEnd,
		);

		const willDisable = await this.projectDisabledDomains(userId, quantity);

		this.logger.info('domainAddon.reductionScheduled', {
			subscription: {
				userId,
				quantity: addon.quantity,
				pendingQuantity: quantity,
				effectiveAt: addon.currentPeriodEnd.toISOString(),
			},
		});

		return {
			quantity: addon.quantity,
			pendingQuantity: quantity,
			effectiveAt: addon.currentPeriodEnd,
			willDisable,
		};
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
