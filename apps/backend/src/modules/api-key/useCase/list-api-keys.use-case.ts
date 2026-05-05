import { inject, injectable } from 'tsyringe';
import { type IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { type TApiKeyResponseDto } from '@shared/schemas';
import { ClerkApiKeysService } from '../service/clerk-api-keys.service';
import { filterKnownScopes } from '../util/filter-known-scopes';

@injectable()
export class ListApiKeysUseCase implements IBaseUseCase {
	constructor(@inject(ClerkApiKeysService) private readonly clerkApiKeys: ClerkApiKeysService) {}

	async execute(userId: string): Promise<TApiKeyResponseDto[]> {
		// UI never paginates — fetch a generous page so all keys show up.
		const { data } = await this.clerkApiKeys.apiKeys.list({ subject: userId, limit: 100 });

		return data
			.filter((key) => !key.revoked)
			.map((key) => ({
				id: key.id,
				name: key.name,
				description: key.description ?? null,
				createdAt: key.createdAt,
				lastUsedAt: key.lastUsedAt,
				expiration: key.expiration,
				revoked: key.revoked,
				scopes: filterKnownScopes(key.scopes),
			}));
	}
}
