import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import AccountDeletionRequestRepository from '../domain/repository/account-deletion-request.repository';
import { AccountDeletionNotificationService } from '../service/account-deletion-notification.service';

/**
 * Records that the user wants their account deleted and tells support. The account stays usable
 * until support deletes it. Asking again while a request is open changes nothing and sends no mail.
 */
@injectable()
export class RequestAccountDeletionUseCase implements IBaseUseCase {
	constructor(
		@inject(AccountDeletionRequestRepository)
		private readonly repository: AccountDeletionRequestRepository,
		@inject(AccountDeletionNotificationService)
		private readonly notification: AccountDeletionNotificationService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	/** @returns when the open request was made */
	async execute(userId: string): Promise<Date> {
		const existing = await this.repository.findByUserId(userId);
		if (existing && !existing.revokedAt) return existing.requestedAt;

		// the column has no sub-second precision; keep the response equal to what a later read returns
		const requestedAt = new Date();
		requestedAt.setMilliseconds(0);

		if (existing) {
			await this.repository.update(existing, { requestedAt, revokedAt: null });
		} else {
			try {
				await this.repository.create({
					id: this.repository.generateId(),
					userId,
					requestedAt,
					revokedAt: null,
				});
			} catch (error) {
				// a parallel request won the unique index
				const raced = await this.repository.findActiveByUserId(userId);
				if (raced) return raced.requestedAt;
				throw error;
			}
		}

		this.logger.info('account.deletion-request.created', { user: { id: userId } });
		await this.notification.notifyRequested(userId, requestedAt);

		return requestedAt;
	}
}
