import { inject, singleton } from 'tsyringe';
import { Mailer } from '@/core/mailer/mailer';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { Logger } from '@/core/logging';
import {
	ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS,
	ACCOUNT_DELETION_MAIL,
	DEFAULT_TIME_ZONE,
} from '@/core/config/constants';
import { env } from '@/core/config/env';
import { ServiceUnavailableError } from '@/core/error/http';

const formatTime = (date: Date) => date.toLocaleString('en-GB', { timeZone: DEFAULT_TIME_ZONE });

/**
 * Mails around account deletion. The owner gets the link that confirms their request. The support
 * inbox hears about confirmed requests and their revocations, which is how they are processed for
 * now; those fail soft, because the request is already stored and a lost mail must not undo it.
 */
@singleton()
export class AccountDeletionNotificationService {
	constructor(
		@inject(Mailer) private readonly mailer: Mailer,
		@inject(ClerkUserInfoService) private readonly clerkUserInfo: ClerkUserInfoService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	/**
	 * Sends the owner the link that confirms the request. Throws when it cannot be sent, so the
	 * dashboard does not claim a mail is on its way; asking again sends a new link.
	 */
	async sendConfirmationLink(userId: string, token: string): Promise<void> {
		const { email, firstName } = await this.clerkUserInfo.getUserInfo(userId);
		if (!email) {
			throw new ServiceUnavailableError('The confirmation mail could not be sent.');
		}

		const template = await this.mailer.getTemplate('account-deletion-confirm');
		const html = template({
			firstName,
			email,
			// in the fragment, so the secret reaches neither server logs nor referrers
			confirmUrl: `${env.FRONTEND_URL}/account-deletion/confirm#token=${token}`,
			validHours: ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS,
			profileUrl: `${env.FRONTEND_URL}/dashboard/settings/profile`,
			logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
			year: new Date().getFullYear(),
		});

		await this.mailer.sendMail({
			to: email,
			subject: 'Confirm the deletion of your QRcodly account',
			html,
			template: 'account-deletion-confirm',
		});
	}

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
