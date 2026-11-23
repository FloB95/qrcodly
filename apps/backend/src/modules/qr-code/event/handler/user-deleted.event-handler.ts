import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { deleteAllOfUser } from '@/core/utils/user-cleanup';
import QrCodeRepository from '../../domain/repository/qr-code.repository';
import { DeleteQrCodeUseCase } from '../../useCase/delete-qr-code.use-case';

/**
 * Deletes the user's QR codes like the dashboard does, which also takes their short URLs, hosted
 * pages, shares, tag links and images with them.
 */
@EventHandler(UserDeletedEvent.eventName)
export class DeleteQrCodesOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const userId = event.user.id;
		const repository = container.resolve(QrCodeRepository);
		const deleteQrCode = container.resolve(DeleteQrCodeUseCase);

		await deleteAllOfUser(
			'qrCode',
			userId,
			(limit) => repository.findAll({ where: { createdBy: { eq: userId } }, page: 1, limit }),
			(qrCode) => deleteQrCode.execute(qrCode, userId),
		);
	}
}
