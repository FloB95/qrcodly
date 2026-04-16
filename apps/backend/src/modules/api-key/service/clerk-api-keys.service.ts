import { singleton } from 'tsyringe';
import { createClerkClient } from '@clerk/fastify';
import { env } from '@/core/config/env';

type ClerkClient = ReturnType<typeof createClerkClient>;
type ClerkApiKeysApi = ClerkClient['apiKeys'];

@singleton()
export class ClerkApiKeysService {
	private readonly clerkClient: ClerkClient = createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
	});

	get apiKeys(): ClerkApiKeysApi {
		return this.clerkClient.apiKeys;
	}
}
