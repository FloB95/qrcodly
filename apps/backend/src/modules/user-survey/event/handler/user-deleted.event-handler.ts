import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { cleanUpAfterUser } from '@/core/utils/user-cleanup';
import UserSurveyRepository from '../../domain/repository/user-survey.repository';

@EventHandler(UserDeletedEvent.eventName)
export class DeleteUserSurveyOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;
		await cleanUpAfterUser('userSurvey', userId, async () => {
			const repository = container.resolve(UserSurveyRepository);
			const survey = await repository.findByUserId(userId);
			if (survey) await repository.delete(survey);
		});
	}
}
