import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import AccountDeletionRequestRepository from '../domain/repository/account-deletion-request.repository';
import { type TAccountDeletionRequest } from '../domain/entities/account-deletion-request.entity';
import { AccountDeletionNotificationService } from '../service/account-deletion-notification.service';
import { createConfirmationToken } from '../service/confirmation-token';

/**
 * Records that the user wants their account deleted and mails them a link to confirm it. Nothing
 * else happens until they open that link: no lock, no mail to support. Asking again while the
 * confirmation is outstanding sends a fresh link; asking again after confirming changes nothing.
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

	/** @returns the open request */
	async execute(userId: string): Promise<TAccountDeletionRequest> {
		const existing = await this.repository.findByUserId(userId);
		const open = existing && !existing.revokedAt ? existing : undefined;
		if (open?.confirmedAt) return open;

		const { token, hash, expiresAt } = createConfirmationToken();
		const link = { confirmationTokenHash: hash, confirmationExpiresAt: expiresAt };

		// the column has no sub-second precision; keep the response equal to what a later read returns
		const requestedAt = new Date();
		requestedAt.setMilliseconds(0);

		let request: TAccountDeletionRequest;
		if (open) {
			// only the newest link works
			request = { ...open, ...link };
			await this.repository.update(open, link);
		} else if (existing) {
			request = { ...existing, ...link, requestedAt, revokedAt: null, confirmedAt: null };
			await this.repository.update(existing, request);
		} else {
			request = {
				id: this.repository.generateId(),
				userId,
				requestedAt,
				revokedAt: null,
				confirmedAt: null,
				...link,
			};
			try {
				await this.repository.create(request);
			} catch (error) {
				// a parallel request won the unique index and mails its own link
				const raced = await this.repository.findActiveByUserId(userId);
				if (raced) return raced;
				throw error;
			}
		}

		this.logger.info('account.deletion-request.created', { user: { id: userId } });
		await this.notification.sendConfirmationLink(userId, token);

		return request;
	}
}
