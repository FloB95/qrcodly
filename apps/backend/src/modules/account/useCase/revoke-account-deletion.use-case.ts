import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import AccountDeletionRequestRepository from '../domain/repository/account-deletion-request.repository';
import { AccountDeletionNotificationService } from '../service/account-deletion-notification.service';
import { AccountWriteLockService } from '../service/account-write-lock.service';

/**
 * Withdraws the user's open deletion request, confirmed or not, and makes its confirmation link
 * useless. Support only hears about it if they were told about the request, i.e. it was confirmed.
 * Without an open request there is nothing to withdraw, so nothing happens and no mail is sent.
 */
@injectable()
export class RevokeAccountDeletionUseCase implements IBaseUseCase {
	constructor(
		@inject(AccountDeletionRequestRepository)
		private readonly repository: AccountDeletionRequestRepository,
		@inject(AccountDeletionNotificationService)
		private readonly notification: AccountDeletionNotificationService,
		@inject(AccountWriteLockService) private readonly writeLock: AccountWriteLockService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(userId: string): Promise<void> {
		const open = await this.repository.findActiveByUserId(userId);
		if (!open) return;

		const revokedAt = new Date();
		const withdrawn = await this.repository.withdraw(open.id, revokedAt);
		// already withdrawn by a parallel call
		if (!withdrawn) return;

		await this.writeLock.forget(userId);

		this.logger.info('account.deletion-request.revoked', { user: { id: userId } });
		if (withdrawn.wasConfirmed) {
			await this.notification.notifyRevoked(userId, open.requestedAt, revokedAt);
		}
	}
}
