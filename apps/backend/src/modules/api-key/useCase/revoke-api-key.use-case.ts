import { inject, injectable } from 'tsyringe';
import { type IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import { ClerkApiKeysService } from '../service/clerk-api-keys.service';
import { ApiKeyNotFoundError } from '../error/http/api-key-not-found.error';

@injectable()
export class RevokeApiKeyUseCase implements IBaseUseCase {
	constructor(
		@inject(ClerkApiKeysService) private readonly clerkApiKeys: ClerkApiKeysService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(apiKeyId: string, userId: string): Promise<void> {
		let apiKey;
		try {
			apiKey = await this.clerkApiKeys.apiKeys.get(apiKeyId);
		} catch {
			throw new ApiKeyNotFoundError();
		}

		if (apiKey.subject !== userId) throw new ApiKeyNotFoundError();

		await this.clerkApiKeys.apiKeys.revoke({ apiKeyId });

		this.logger.info('api-key.revoked', { apiKey: { id: apiKeyId, userId } });
	}
}
