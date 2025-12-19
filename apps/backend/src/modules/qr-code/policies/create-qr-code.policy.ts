import { QR_CODE_PLAN_LIMITS, type PlanName } from '@/core/config/plan.config';
import { UnauthorizedError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { type IUser } from '@/core/interface/user.interface';
import { AbstractPolicy } from '@/core/policies/abstract.policy';
import { type TQrCodeContentType, type TCreateQrCodeDto } from '@shared/schemas';

// 0. limit possible creations by type & plan
// 1. limit qr code create type text to pro plan
//

export class CreateQrCodePolicy extends AbstractPolicy {
	private limitsByQrCodeType: Record<PlanName, Partial<Record<TQrCodeContentType, number | null>>> =
		QR_CODE_PLAN_LIMITS;

	constructor(
		private readonly user: IUser | null,
		private readonly dto: TCreateQrCodeDto,
	) {
		super();
	}

	private getLimitKey(): string {
		return `CreateQrCodePolicy:${this.user!.id}:${this.dto.content.type}`;
	}

	async checkAccess(): Promise<true> {
		const limit = this.limitsByQrCodeType[this.user?.plan ?? 'free']?.[this.dto.content.type];

		// if no limits set allow access
		if (limit === undefined || limit === null) return true;

		// if limits = 0 deny access
		if (limit === 0) {
			throw new PlanLimitExceededError(`${this.dto.content.type} QR Code`, limit);
		}

		// check limit for user
		if (this.user) {
			const used = await this.usageService.count(this.user.id, this.getLimitKey());
			if (used >= limit)
				throw new PlanLimitExceededError(`${this.dto.content.type} QR Code`, limit);
			return true;
		}

		// if user is not logged in and there is a free plan limit
		throw new UnauthorizedError(
			`You need to be logged in to create ${this.dto.content.type} QR Codes`,
		);
	}

	async incrementUsage(): Promise<void> {
		if (!this.user) return;
		await this.usageService.increment(this.user.id, this.getLimitKey());
	}
}
