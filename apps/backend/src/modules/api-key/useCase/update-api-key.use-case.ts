import { inject, injectable } from 'tsyringe';
import { type IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import { type TApiKeyResponseDto, type TUpdateApiKeyDto } from '@shared/schemas';
import { ClerkApiKeysService } from '../service/clerk-api-keys.service';
import { ApiKeyNotFoundError } from '../error/http/api-key-not-found.error';
import { filterKnownScopes } from '../util/filter-known-scopes';

function isClerkClientError(err: unknown): boolean {
	if (typeof err !== 'object' || err === null || !('status' in err)) return false;
	const status = (err as { status: unknown }).status;
	return typeof status === 'number' && status >= 400 && status < 500;
}

@injectable()
export class UpdateApiKeyUseCase implements IBaseUseCase {
	constructor(
		@inject(ClerkApiKeysService) private readonly clerkApiKeys: ClerkApiKeysService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(
		apiKeyId: string,
		dto: TUpdateApiKeyDto,
		userId: string,
	): Promise<TApiKeyResponseDto> {
		let existing;
		try {
			existing = await this.clerkApiKeys.apiKeys.get(apiKeyId);
		} catch (err) {
			if (isClerkClientError(err)) throw new ApiKeyNotFoundError();
			throw err;
		}

		if (existing.subject !== userId) throw new ApiKeyNotFoundError();

		let updated;
		try {
			updated = await this.clerkApiKeys.apiKeys.update({
				apiKeyId,
				subject: userId,
				...(dto.description !== undefined ? { description: dto.description } : {}),
				...(dto.scopes !== undefined ? { scopes: dto.scopes } : {}),
				...(dto.expiresInDays !== undefined
					? {
							secondsUntilExpiration: dto.expiresInDays === null ? null : dto.expiresInDays * 86400,
						}
					: {}),
			});
		} catch (err) {
			if (isClerkClientError(err)) throw new ApiKeyNotFoundError();
			throw err;
		}

		this.logger.info('api-key.updated', { apiKey: { id: apiKeyId, userId } });

		return {
			id: updated.id,
			name: updated.name,
			description: updated.description ?? null,
			createdAt: updated.createdAt,
			lastUsedAt: updated.lastUsedAt,
			expiration: updated.expiration,
			revoked: updated.revoked,
			scopes: filterKnownScopes(updated.scopes),
		};
	}
}
