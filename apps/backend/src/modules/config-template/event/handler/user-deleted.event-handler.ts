import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { deleteAllOfUser } from '@/core/utils/user-cleanup';
import ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { DeleteConfigTemplateUseCase } from '../../useCase/delete-config-template.use-case';

@EventHandler(UserDeletedEvent.eventName)
export class DeleteConfigTemplatesOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;
		const repository = container.resolve(ConfigTemplateRepository);
		const deleteConfigTemplate = container.resolve(DeleteConfigTemplateUseCase);

		await deleteAllOfUser(
			'configTemplate',
			userId,
			(limit) => repository.findAll({ where: { createdBy: { eq: userId } }, page: 1, limit }),
			(configTemplate) => deleteConfigTemplate.execute(configTemplate, userId),
		);
	}
}
