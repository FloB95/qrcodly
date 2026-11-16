import { singleton } from 'tsyringe';
import { and, desc, eq, gt, isNotNull, isNull } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import accountDeletionRequest, {
	type TAccountDeletionRequest,
} from '../entities/account-deletion-request.entity';

@singleton()
class AccountDeletionRequestRepository extends AbstractRepository<TAccountDeletionRequest> {
	table = accountDeletionRequest;

	constructor() {
		super();
	}

	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TAccountDeletionRequest>): Promise<TAccountDeletionRequest[]> {
		const query = this.db
			.select()
			.from(this.table)
			.orderBy(desc(this.table.requestedAt))
			.$dynamic();

		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);

		return await query.execute();
	}

	async findOneById(id: string): Promise<TAccountDeletionRequest | undefined> {
		return await this.db.query.accountDeletionRequest.findFirst({
			where: eq(this.table.id, id),
		});
	}

	async findByUserId(userId: string): Promise<TAccountDeletionRequest | undefined> {
		return await this.db.query.accountDeletionRequest.findFirst({
			where: eq(this.table.userId, userId),
		});
	}

	/** The request that is still open, i.e. made and not revoked, whether confirmed yet or not */
	async findActiveByUserId(userId: string): Promise<TAccountDeletionRequest | undefined> {
		return await this.db.query.accountDeletionRequest.findFirst({
			where: and(eq(this.table.userId, userId), isNull(this.table.revokedAt)),
		});
	}

	/** The open request the user confirmed by mail: only this one counts as a deletion request */
	async findConfirmedByUserId(userId: string): Promise<TAccountDeletionRequest | undefined> {
		return await this.db.query.accountDeletionRequest.findFirst({
			where: and(
				eq(this.table.userId, userId),
				isNull(this.table.revokedAt),
				isNotNull(this.table.confirmedAt),
			),
		});
	}

	/** The open request a confirmation link belongs to */
	async findOpenByConfirmationTokenHash(
		hash: string,
	): Promise<TAccountDeletionRequest | undefined> {
		return await this.db.query.accountDeletionRequest.findFirst({
			where: and(eq(this.table.confirmationTokenHash, hash), isNull(this.table.revokedAt)),
		});
	}

	/**
	 * Marks a request confirmed, but only while it still is the open, unconfirmed request this
	 * link belongs to and the link has not run out. A withdrawal, a newer link or the expiry
	 * between reading and writing must not be confirmed by the old link.
	 * @returns whether this call confirmed the request
	 */
	async confirm(id: string, tokenHash: string, confirmedAt: Date): Promise<boolean> {
		const [result] = await this.db
			.update(this.table)
			.set({ confirmedAt })
			.where(
				and(
					eq(this.table.id, id),
					eq(this.table.confirmationTokenHash, tokenHash),
					isNull(this.table.revokedAt),
					isNull(this.table.confirmedAt),
					gt(this.table.confirmationExpiresAt, confirmedAt),
				),
			)
			.execute();
		return result.affectedRows > 0;
	}

	async create(item: TAccountDeletionRequest): Promise<void> {
		await this.db.insert(this.table).values(item).execute();
	}

	async update(
		item: TAccountDeletionRequest,
		updates: Partial<TAccountDeletionRequest>,
	): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, item.id)).execute();
	}

	async delete(item: TAccountDeletionRequest): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, item.id)).execute();
		return true;
	}
}

export default AccountDeletionRequestRepository;
