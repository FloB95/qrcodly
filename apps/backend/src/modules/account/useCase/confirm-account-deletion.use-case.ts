import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import AccountDeletionRequestRepository from '../domain/repository/account-deletion-request.repository';
import { type TAccountDeletionRequest } from '../domain/entities/account-deletion-request.entity';
import { AccountDeletionLinkInvalidError } from '../error/http/account-deletion-link-invalid.error';
import { AccountDeletionNotificationService } from '../service/account-deletion-notification.service';
import { AccountWriteLockService } from '../service/account-write-lock.service';
import { hashConfirmationToken } from '../service/confirmation-token';

/**
 * Turns a request into a real one once the owner opened the link we mailed them: from here on the
 * account is read-only and support is told to delete it. The link proves access to the account's
 * mailbox, so it works without a session. Opening it a second time changes nothing.
 */
@injectable()
export class ConfirmAccountDeletionUseCase implements IBaseUseCase {
	constructor(
		@inject(AccountDeletionRequestRepository)
		private readonly repository: AccountDeletionRequestRepository,
		@inject(AccountDeletionNotificationService)
		private readonly notification: AccountDeletionNotificationService,
		@inject(AccountWriteLockService) private readonly writeLock: AccountWriteLockService,
		@inject(ClerkUserInfoService) private readonly clerkUserInfo: ClerkUserInfoService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(token: string): Promise<TAccountDeletionRequest> {
		const tokenHash = hashConfirmationToken(token);
		const request = await this.repository.findOpenByConfirmationTokenHash(tokenHash);
		if (!request) {
			this.logger.warn('account.deletion-request.confirm_rejected', { reason: 'unknown_link' });
			throw new AccountDeletionLinkInvalidError();
		}
		if (request.confirmedAt) return request;

		if (!request.confirmationExpiresAt || request.confirmationExpiresAt < new Date()) {
			this.logger.warn('account.deletion-request.confirm_rejected', {
				reason: 'expired_link',
				user: { id: request.userId },
			});
			throw new AccountDeletionLinkInvalidError();
		}

		// kept for the goodbye mail: once the account is deleted, Clerk no longer has the address
		const { email } = await this.clerkUserInfo.getUserInfo(request.userId);
		if (!email) {
			this.logger.warn('account.deletion-request.email_unknown', { user: { id: request.userId } });
		}

		// the column has no sub-second precision; keep the response equal to what a later read returns
		const confirmedAt = new Date();
		confirmedAt.setMilliseconds(0);
		if (!(await this.repository.confirm(request.id, tokenHash, confirmedAt, email || null))) {
			// the request changed since it was read: confirmed by a parallel click, withdrawn or replaced
			const current = await this.repository.findOpenByConfirmationTokenHash(tokenHash);
			if (current?.confirmedAt) return current;

			this.logger.warn('account.deletion-request.confirm_rejected', {
				reason: 'changed_meanwhile',
				user: { id: request.userId },
			});
			throw new AccountDeletionLinkInvalidError();
		}

		await this.writeLock.forget(request.userId);

		this.logger.info('account.deletion-request.confirmed', { user: { id: request.userId } });
		// a withdrawal may have landed since the write: support has then already been told about it
		// and must not get the request as the later, seemingly current mail
		if (await this.repository.findConfirmedByUserId(request.userId)) {
			await this.notification.notifyRequested(request.userId, request.requestedAt);
		}

		return { ...request, confirmedAt, email: email || null };
	}
}
