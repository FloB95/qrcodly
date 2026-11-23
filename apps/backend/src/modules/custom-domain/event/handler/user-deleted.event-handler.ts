import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { deleteAllOfUser } from '@/core/utils/user-cleanup';
import CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import { DeleteCustomDomainUseCase } from '../../useCase/delete-custom-domain.use-case';

/** Deletes the user's custom domains like the dashboard does, including the Cloudflare hostname. */
@EventHandler(UserDeletedEvent.eventName)
export class DeleteCustomDomainsOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;
		const repository = container.resolve(CustomDomainRepository);
		const deleteCustomDomain = container.resolve(DeleteCustomDomainUseCase);

		await deleteAllOfUser(
			'customDomain',
			userId,
			() => repository.findAllByUserId(userId),
			(customDomain) => deleteCustomDomain.execute(customDomain),
		);
	}
}
