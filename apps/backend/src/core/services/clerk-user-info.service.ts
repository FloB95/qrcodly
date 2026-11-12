import { inject, singleton } from 'tsyringe';
import { createClerkClient, type User } from '@clerk/fastify';
import { env } from '../config/env';
import { type TClerkUserInfo, type TClerkUserPage } from '../interface/clerk-user-info.interface';
import { Logger } from '../logging';
import { trackExternal } from '../metrics';

/**
 * Reads users from Clerk.
 *
 * `getUserInfo` looks up the contact details needed to send a user an email and fails soft: a
 * Clerk outage must not stop a subscription transition from being recorded, so a failed lookup
 * yields an empty address and the caller simply sends no mail. `getUser` and `listUsers` throw.
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

	/** A deleted or unknown account is rejected with an error whose `status` is 404 */
	async getUser(userId: string): Promise<User> {
		return trackExternal('clerk', 'users.getUser', () => this.clerkClient.users.getUser(userId));
	}

	/** One page of users, oldest first; Clerk allows a `limit` of up to 500 */
	async listUsers({ limit, offset }: TClerkUserPage): Promise<User[]> {
		const page = await trackExternal('clerk', 'users.getUserList', () =>
			this.clerkClient.users.getUserList({ limit, offset, orderBy: '+created_at' }),
		);
		return page.data;
	}
}
