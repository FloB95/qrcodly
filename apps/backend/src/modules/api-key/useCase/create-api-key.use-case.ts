import { inject, injectable } from 'tsyringe';
import { type IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import { PlanName } from '@/core/config/plan.config';
import { type TCreateApiKeyDto, type TCreateApiKeyResponseDto } from '@shared/schemas';
import { ClerkApiKeysService } from '../service/clerk-api-keys.service';
import { ProPlanRequiredError } from '../error/http/pro-plan-required.error';

@injectable()
export class CreateApiKeyUseCase implements IBaseUseCase {
	constructor(
		@inject(ClerkApiKeysService) private readonly clerkApiKeys: ClerkApiKeysService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(
		dto: TCreateApiKeyDto,
		userId: string,
		plan: PlanName,
	): Promise<TCreateApiKeyResponseDto> {
		if (plan !== PlanName.PRO) throw new ProPlanRequiredError();

		const apiKey = await this.clerkApiKeys.apiKeys.create({
			name: dto.name,
			subject: userId,
			createdBy: userId,
			description: dto.description ?? null,
			secondsUntilExpiration: dto.expiresInDays ? dto.expiresInDays * 86400 : null,
		});

		if (!apiKey.secret) {
			throw new Error('Clerk did not return a secret for the newly created API key.');
		}

		this.logger.info('api-key.created', { apiKey: { id: apiKey.id, userId } });

		return {
			id: apiKey.id,
			name: apiKey.name,
			description: apiKey.description ?? null,
			createdAt: apiKey.createdAt,
			lastUsedAt: apiKey.lastUsedAt,
			expiration: apiKey.expiration,
			revoked: apiKey.revoked,
			secret: apiKey.secret,
		};
	}
}
