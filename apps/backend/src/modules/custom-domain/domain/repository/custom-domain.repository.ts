import { singleton } from 'tsyringe';
import { and, count, desc, eq } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import customDomain, { TCustomDomain } from '../entities/custom-domain.entity';
import crypto from 'crypto';

/**
 * Repository for managing Custom Domain entities.
 */
@singleton()
class CustomDomainRepository extends AbstractRepository<TCustomDomain> {
	table = customDomain;

	constructor() {
		super();
	}

	/**
	 * Finds all Custom Domains based on the provided query parameters.
	 * @param options - Query options.
	 * @returns A promise that resolves to an array of Custom Domains.
	 */
	async findAll({ limit, page, where }: ISqlQueryFindBy<TCustomDomain>): Promise<TCustomDomain[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		// add where conditions
		if (where) void this.withWhere(query, where);

		// add pagination
		void this.withPagination(query, page, limit);
		const customDomains = await query.execute();
		return customDomains;
	}

	/**
	 * Finds a Custom Domain by its ID.
	 * @param id - The ID of the Custom Domain.
	 * @returns A promise that resolves to the Custom Domain if found, otherwise undefined.
	 */
	async findOneById(id: string): Promise<TCustomDomain | undefined> {
		const result = await this.db.query.customDomain.findFirst({
			where: eq(this.table.id, id),
		});
		return result;
	}

	/**
	 * Finds a Custom Domain by its domain name.
	 * @param domain - The domain name.
	 * @returns A promise that resolves to the Custom Domain if found, otherwise undefined.
	 */
	async findOneByDomain(domain: string): Promise<TCustomDomain | undefined> {
		const result = await this.db.query.customDomain.findFirst({
			where: eq(this.table.domain, domain.toLowerCase()),
		});
		return result;
	}

	/**
	 * Counts total domains for a user.
	 * @param userId - The user ID.
	 * @returns A promise that resolves to the count of domains.
	 */
	async countByUserId(userId: string): Promise<number> {
		const result = await this.db
			.select({ count: count() })
			.from(this.table)
			.where(eq(this.table.createdBy, userId))
			.execute();
		return result[0]?.count ?? 0;
	}

	/**
	 * Updates a Custom Domain with the provided updates.
	 * @param customDomain - The Custom Domain to update.
	 * @param updates - The updates to apply to the Custom Domain.
	 */
	async update(customDomain: TCustomDomain, updates: Partial<TCustomDomain>): Promise<void> {
		await this.db
			.update(this.table)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(this.table.id, customDomain.id))
			.execute();
	}

	/**
	 * Deletes a Custom Domain.
	 * @param customDomain - The Custom Domain to delete.
	 * @returns A promise that resolves to true if the Custom Domain was deleted successfully.
	 */
	async delete(customDomain: TCustomDomain): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, customDomain.id)).execute();
		await this.clearCache();
		return true;
	}

	/**
	 * Creates a new Custom Domain.
	 * @param customDomain - The Custom Domain to create.
	 */
	async create(customDomain: Omit<TCustomDomain, 'createdAt' | 'updatedAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: customDomain.id,
				domain: customDomain.domain.toLowerCase(),
				isVerified: customDomain.isVerified,
				verificationToken: customDomain.verificationToken,
				createdBy: customDomain.createdBy,
				createdAt: new Date(),
			})
			.execute();

		await this.clearCache();
	}

	/**
	 * Generates a secure verification token.
	 * @returns A 64-character hex string.
	 */
	generateVerificationToken(): string {
		return crypto.randomBytes(32).toString('hex');
	}

	/**
	 * Finds the default domain for a user.
	 * @param userId - The user ID.
	 * @returns The default domain if set, otherwise undefined.
	 */
	async findDefaultByUserId(userId: string): Promise<TCustomDomain | undefined> {
		const result = await this.db.query.customDomain.findFirst({
			where: and(eq(this.table.createdBy, userId), eq(this.table.isDefault, true)),
		});
		return result;
	}

	/**
	 * Sets a domain as default and unsets any previous default for the user.
	 * @param domainId - The domain ID to set as default.
	 * @param userId - The user ID.
	 */
	async setDefault(domainId: string, userId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			// First, unset any existing default for this user
			await tx
				.update(this.table)
				.set({ isDefault: false, updatedAt: new Date() })
				.where(and(eq(this.table.createdBy, userId), eq(this.table.isDefault, true)));

			// Then set the new default
			await tx
				.update(this.table)
				.set({ isDefault: true, updatedAt: new Date() })
				.where(eq(this.table.id, domainId));
		});
	}

	/**
	 * Clears the default domain for a user.
	 * @param userId - The user ID.
	 */
	async clearDefault(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({ isDefault: false, updatedAt: new Date() })
			.where(and(eq(this.table.createdBy, userId), eq(this.table.isDefault, true)))
			.execute();
	}
}

export default CustomDomainRepository;
