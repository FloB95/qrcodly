import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { cleanUpAfterUser } from '@/core/utils/user-cleanup';
import { EndBillingOfDeletedUserUseCase } from '../../useCase/end-billing-of-deleted-user.use-case';

@EventHandler(UserDeletedEvent.eventName)
export class EndBillingOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;
		await cleanUpAfterUser('billing', userId, () =>
			container.resolve(EndBillingOfDeletedUserUseCase).execute(userId),
		);
	}
}
