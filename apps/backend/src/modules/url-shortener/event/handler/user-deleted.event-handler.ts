import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { cleanUpAfterUser, deleteAllOfUser } from '@/core/utils/user-cleanup';
import ShortUrlRepository from '../../domain/repository/short-url.repository';
import UrlSafetyIncidentRepository from '../../domain/repository/url-safety-incident.repository';
import UserSafetyStandingRepository from '../../domain/repository/user-safety-standing.repository';
import { DeleteShortUrlUseCase } from '../../useCase/delete-short-url.use-case';

/**
 * Deletes the user's standalone short URLs like the dashboard does; the codes stay reserved, so
 * they are never handed out again. Links of QR codes go with their QR code. Also removes the
 * user's URL safety record.
 */
@EventHandler(UserDeletedEvent.eventName)
export class DeleteShortUrlsOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;
		const repository = container.resolve(ShortUrlRepository);
		const deleteShortUrl = container.resolve(DeleteShortUrlUseCase);

		await deleteAllOfUser(
			'shortUrl',
			userId,
			async () =>
				(await repository.findAllForUser(userId)).filter(
					(shortUrl) => shortUrl.qrCodeId === null && shortUrl.hostedPageId === null,
				),
			(shortUrl) => deleteShortUrl.execute(shortUrl, userId),
		);

		await cleanUpAfterUser('urlSafety', userId, async () => {
			await container.resolve(UrlSafetyIncidentRepository).deleteAllForUser(userId);
			const standingRepository = container.resolve(UserSafetyStandingRepository);
			const standing = await standingRepository.findOneById(userId);
			if (standing) await standingRepository.delete(standing);
		});
	}
}
