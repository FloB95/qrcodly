import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import AccountDeletionRequestRepository from '../domain/repository/account-deletion-request.repository';
import { AccountDeletionNotificationService } from '../service/account-deletion-notification.service';

/**
 * Closes the deletion request of a user who is now deleted. Only someone who asked for the
 * deletion and confirmed it gets the goodbye mail; an account removed for other reasons does not.
 * The request goes away with the account. When the mail fails, the request stays, so handling the
 * deletion again still sends it.
 */
@injectable()
export class FinishAccountDeletionUseCase implements IBaseUseCase {
	constructor(
		@inject(AccountDeletionRequestRepository)
		private readonly repository: AccountDeletionRequestRepository,
		@inject(AccountDeletionNotificationService)
		private readonly notification: AccountDeletionNotificationService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(userId: string): Promise<void> {
		const request = await this.repository.findByUserId(userId);
		if (!request) return;

		if (request.confirmedAt && !request.revokedAt) {
			if (request.email) {
				await this.notification.sendGoodbye(request.email);
				this.logger.info('account.deleted.goodbye_sent', { user: { id: userId } });
			} else {
				this.logger.warn('account.deleted.goodbye_skipped', {
					user: { id: userId },
					reason: 'email_unknown',
				});
			}
		}

		await this.repository.delete(request);
	}
}
