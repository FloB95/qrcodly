import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { deleteAllOfUser } from '@/core/utils/user-cleanup';
import TagRepository from '../../domain/repository/tag.repository';
import { DeleteTagUseCase } from '../../useCase/delete-tag.use-case';

@EventHandler(UserDeletedEvent.eventName)
export class DeleteTagsOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;
		const repository = container.resolve(TagRepository);
		const deleteTag = container.resolve(DeleteTagUseCase);

		await deleteAllOfUser(
			'tag',
			userId,
			(limit) => repository.findAll({ where: { createdBy: { eq: userId } }, page: 1, limit }),
			(tag) => deleteTag.execute(tag, userId),
		);
	}
}
