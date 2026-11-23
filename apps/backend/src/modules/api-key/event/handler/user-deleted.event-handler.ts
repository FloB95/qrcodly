import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { deleteAllOfUser } from '@/core/utils/user-cleanup';
import { ListApiKeysUseCase } from '../../useCase/list-api-keys.use-case';
import { RevokeApiKeyUseCase } from '../../useCase/revoke-api-key.use-case';

/**
 * Revokes the user's API keys in Clerk. Clerk does not document that deleting a user ends their
 * keys, and our auth only looks at the key, so a leftover key would still write for a deleted user.
 */
@EventHandler(UserDeletedEvent.eventName)
export class RevokeApiKeysOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;
		const listApiKeys = container.resolve(ListApiKeysUseCase);
		const revokeApiKey = container.resolve(RevokeApiKeyUseCase);

		await deleteAllOfUser(
			'apiKey',
			userId,
			() => listApiKeys.execute(userId),
			(apiKey) => revokeApiKey.execute(apiKey.id, userId),
		);
	}
}
