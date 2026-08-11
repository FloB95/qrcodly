import { inject, singleton } from 'tsyringe';
import { createClerkClient } from '@clerk/fastify';
import { env } from '../config/env';
import { Logger } from '../logging';

export type TClerkUserInfo = { email: string; firstName?: string };

/**
 * Looks up the contact details needed to send a user an email.
 *
 * Fails soft: a Clerk outage must not stop a subscription transition from being recorded, so a
 * failed lookup yields an empty address and the caller simply sends no mail.
 */
@singleton()
export class ClerkUserInfoService {
	private clerkClient: ReturnType<typeof createClerkClient>;

	constructor(@inject(Logger) private readonly logger: Logger) {
		this.clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
	}

	async getUserInfo(userId: string): Promise<TClerkUserInfo> {
		try {
			const user = await this.clerkClient.users.getUser(userId);
			return {
				email: user.emailAddresses[0]?.emailAddress ?? '',
				firstName: user.firstName ?? undefined,
			};
		} catch (error) {
			this.logger.error('clerk.getUserInfo.failed', {
				user: { id: userId },
				error: error as Error,
			});
			return { email: '' };
		}
	}
}
