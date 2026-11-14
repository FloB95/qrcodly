import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import AccountDeletionRequestRepository from '../domain/repository/account-deletion-request.repository';
import { AccountDeletionNotificationService } from '../service/account-deletion-notification.service';

/**
 * Withdraws the user's open deletion request and tells support not to delete the account.
 * Without an open request there is nothing to withdraw, so nothing happens and no mail is sent.
 */
@injectable()
export class RevokeAccountDeletionUseCase implements IBaseUseCase {
	constructor(
		@inject(AccountDeletionRequestRepository)
		private readonly repository: AccountDeletionRequestRepository,
		@inject(AccountDeletionNotificationService)
		private readonly notification: AccountDeletionNotificationService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(userId: string): Promise<void> {
		const open = await this.repository.findActiveByUserId(userId);
		if (!open) return;

		const revokedAt = new Date();
		await this.repository.update(open, { revokedAt });

		this.logger.info('account.deletion-request.revoked', { user: { id: userId } });
		await this.notification.notifyRevoked(userId, open.requestedAt, revokedAt);
	}
}
