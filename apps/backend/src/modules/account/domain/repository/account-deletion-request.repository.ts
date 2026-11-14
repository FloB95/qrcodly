import { singleton } from 'tsyringe';
import { and, desc, eq, isNull } from 'drizzle-orm';
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

	/** The request that is still open, i.e. made and not revoked */
	async findActiveByUserId(userId: string): Promise<TAccountDeletionRequest | undefined> {
		return await this.db.query.accountDeletionRequest.findFirst({
			where: and(eq(this.table.userId, userId), isNull(this.table.revokedAt)),
		});
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
