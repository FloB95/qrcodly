import { type FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { AccountDeletionPendingError } from '@/core/error/http/account-deletion-pending.error';
import { AccountWriteLockService } from '@/modules/account/service/account-write-lock.service';

/**
 * preHandler that rejects creating and changing data while the account waits for its deletion,
 * i.e. from the moment the owner confirmed the request by mail. Reading and deleting stay possible.
 * Asked on every such request, so the answer comes from a cache that confirming and withdrawing
 * reset: both take effect at once.
 */
export const enforceAccountWritable = async (request: FastifyRequest): Promise<void> => {
	const user = request.user;
	if (!user) return;

	if (await container.resolve(AccountWriteLockService).isLocked(user.id)) {
		throw new AccountDeletionPendingError();
	}
};
