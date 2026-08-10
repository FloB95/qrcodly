import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { type TCustomDomain } from '@/modules/custom-domain/domain/entities/custom-domain.entity';
import { CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';

export type TEnforceCustomDomainLimitResult = {
	effectiveLimit: number;
	/** Domain names that were (or would be) re-enabled. */
	enabled: string[];
	/** Domain names that were (or would be) disabled. */
	disabled: string[];
};

/**
 * Brings a user's custom domains in line with what they are entitled to.
 *
 * Idempotent, so it is safe to run from the webhook, the cron sweep and the reconciliation job.
 * Pass `dryRun` to get the same decision without writing — the purchase dialog and the
 * cancellation email use it so they can never name a different domain than the one that dies.
 */
@injectable()
export class EnforceCustomDomainLimitUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(CustomDomainEntitlementService)
		private entitlementService: CustomDomainEntitlementService,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(
		userId: string,
		options: {
			dryRun?: boolean;
			/**
			 * Answers "what would happen at this limit" instead of using the current entitlement.
			 * Used to name the doomed domains in the cancellation email while the add-on is still
			 * active — always together with `dryRun`.
			 */
			overrideLimit?: number;
		} = {},
	): Promise<TEnforceCustomDomainLimitResult> {
		const entitlement = await this.entitlementService.getCustomDomainLimit(userId);
		const effectiveLimit = options.overrideLimit ?? entitlement.effectiveLimit;
		const domains = await this.customDomainRepository.findAllByUserId(userId);

		const keptIds = new Set(
			this.rankByRetentionPriority(domains)
				.slice(0, effectiveLimit)
				.map((domain) => domain.id),
		);

		const enabled: string[] = [];
		const disabled: string[] = [];

		for (const domain of domains) {
			if (keptIds.has(domain.id)) {
				if (domain.isEnabled) continue;
				enabled.push(domain.domain);
				if (!options.dryRun) {
					await this.customDomainRepository.update(domain, { isEnabled: true });
				}
			} else {
				if (!domain.isEnabled && !domain.isDefault) continue;
				disabled.push(domain.domain);
				if (!options.dryRun) {
					await this.customDomainRepository.update(domain, { isEnabled: false, isDefault: false });
				}
			}
		}

		if (!options.dryRun && (enabled.length > 0 || disabled.length > 0)) {
			this.logger.info('customDomain.limitEnforced', {
				customDomain: { userId, effectiveLimit, enabled, disabled },
			});
		}

		return { effectiveLimit, enabled, disabled };
	}

	/**
	 * The default domain first — losing the one that live short URLs route through is the most
	 * damaging outcome — then oldest first. The id breaks ties so two domains created in the same
	 * second cannot flip between runs.
	 */
	private rankByRetentionPriority(domains: TCustomDomain[]): TCustomDomain[] {
		return [...domains].sort((a, b) => {
			if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
			const byCreatedAt = a.createdAt.getTime() - b.createdAt.getTime();
			if (byCreatedAt !== 0) return byCreatedAt;
			return a.id.localeCompare(b.id);
		});
	}
}
