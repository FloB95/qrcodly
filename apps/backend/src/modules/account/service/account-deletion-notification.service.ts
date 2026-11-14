import { inject, singleton } from 'tsyringe';
import { Mailer } from '@/core/mailer/mailer';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { Logger } from '@/core/logging';
import { ACCOUNT_DELETION_MAIL, DEFAULT_TIME_ZONE } from '@/core/config/constants';

const formatTime = (date: Date) => date.toLocaleString('en-GB', { timeZone: DEFAULT_TIME_ZONE });

/**
 * Tells the support inbox about account deletion requests and revocations, which is how they are
 * processed for now. Fails soft: the request is already stored, so a lost mail must not undo it.
 */
@singleton()
export class AccountDeletionNotificationService {
	constructor(
		@inject(Mailer) private readonly mailer: Mailer,
		@inject(ClerkUserInfoService) private readonly clerkUserInfo: ClerkUserInfoService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async notifyRequested(userId: string, requestedAt: Date): Promise<void> {
		await this.notify(userId, requestedAt);
	}

	async notifyRevoked(userId: string, requestedAt: Date, revokedAt: Date): Promise<void> {
		await this.notify(userId, requestedAt, revokedAt);
	}

	private async notify(userId: string, requestedAt: Date, revokedAt?: Date): Promise<void> {
		try {
			const { email, firstName } = await this.clerkUserInfo.getUserInfo(userId);
			const template = await this.mailer.getTemplate('account-deletion-admin-alert');
			const html = template({
				isRevoked: !!revokedAt,
				userId,
				email,
				firstName,
				requestedAt: formatTime(requestedAt),
				revokedAt: revokedAt ? formatTime(revokedAt) : undefined,
				clerkUserUrl: `https://dashboard.clerk.com/last-active?path=users/${userId}`,
				year: new Date().getFullYear(),
			});

			const who = email || userId;
			await this.mailer.sendMail({
				to: ACCOUNT_DELETION_MAIL,
				subject: revokedAt
					? `Account deletion withdrawn: ${who}`
					: `Account deletion requested: ${who}`,
				html,
				template: 'account-deletion-admin-alert',
			});
		} catch (error) {
			this.logger.error('account.deletion-request.notify_failed', {
				user: { id: userId },
				kind: revokedAt ? 'revoked' : 'requested',
				error: error as Error,
			});
		}
	}
}
