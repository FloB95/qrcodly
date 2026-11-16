import { type FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { AccountDeletionPendingError } from '@/core/error/http/account-deletion-pending.error';
import AccountDeletionRequestRepository from '@/modules/account/domain/repository/account-deletion-request.repository';

/**
 * preHandler that rejects creating and changing data while the account waits for its deletion.
 * Reading and deleting stay possible. Looked up per request, so a withdrawal lifts the lock at once.
 */
export const enforceAccountWritable = async (request: FastifyRequest): Promise<void> => {
	const user = request.user;
	if (!user) return;

	const open = await container
		.resolve(AccountDeletionRequestRepository)
		.findActiveByUserId(user.id);
	if (open) throw new AccountDeletionPendingError();
};
