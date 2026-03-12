import { singleton } from 'tsyringe';
import { and, desc, eq, inArray, isNull, isNotNull, sql, SQL } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy, type WhereConditions } from '@/core/interface/repository.interface';
import shortUrl, { TShortUrl, TShortUrlWithDomain } from '../entities/short-url.entity';
import { convertWhereConditionToDrizzle } from '@/core/db/utils';
import shortUrlTag from '../entities/short-url-tag.entity';

/**
 * Repository for managing Short URL entities.
 */
@singleton()
class ShortUrlRepository extends AbstractRepository<TShortUrl> {
	table = shortUrl;

	constructor() {
		super();
	}

	private tagIdsCondition(tagIds: string[]): SQL {
		return inArray(
			this.table.id,
			this.db
				.select({ shortUrlId: shortUrlTag.shortUrlId })
				.from(shortUrlTag)
				.where(inArray(shortUrlTag.tagId, tagIds)),
		);
	}

	/**
	 * Builds SQL conditions for filtering short URLs.
	 * Splits search fields (shortCode, destinationUrl) into OR conditions,
	 * and remaining fields into AND conditions.
	 */
	private buildFilterConditions(
		where?: WhereConditions<TShortUrl> | SQL,
		standalone?: boolean,
		tagIds?: string[],
	): SQL[] {
		const conditions: SQL[] = [isNull(this.table.deletedAt)];

		if (where && !(where instanceof SQL)) {
			const { shortCode, destinationUrl, ...rest } = where;
			const searchWhere: WhereConditions<TShortUrl> = {
				...(shortCode && { shortCode }),
				...(destinationUrl && { destinationUrl }),
			};
			const searchSql = Object.keys(searchWhere).length
				? convertWhereConditionToDrizzle(searchWhere, this.table, 'or')
				: undefined;
			const restSql = Object.keys(rest).length
				? convertWhereConditionToDrizzle(rest as WhereConditions<TShortUrl>, this.table)
				: undefined;
			if (searchSql) conditions.push(searchSql);
			if (restSql) conditions.push(restSql);
		} else if (where instanceof SQL) {
			conditions.push(where);
		}

		if (standalone) {
			conditions.push(isNull(this.table.qrCodeId));
			conditions.push(isNotNull(this.table.destinationUrl));
		}

		if (tagIds?.length) {
			conditions.push(this.tagIdsCondition(tagIds));
		}

		return conditions;
	}

	/**
	 * Finds all Short URLs based on the provided query parameters.
	 * @param options - Query options.
	 * @returns A promise that resolves to an array of Short URLs.
	 */
	async findAll({ limit, page, where }: ISqlQueryFindBy<TShortUrl>): Promise<TShortUrl[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		// add where conditions
		if (where) void this.withWhere(query, where);

		// add pagination
		void this.withPagination(query, page, limit);
		const shortUrls = await query.execute();
		return shortUrls;
	}

	/**
	 * Finds a Short URL by its ID, including the custom domain name.
	 * @param id - The ID of the Short URL.
	 * @returns A promise that resolves to the Short URL if found, otherwise undefined.
	 */
	async findOneById(id: string): Promise<TShortUrlWithDomain | undefined> {
		const result = await this.db.query.shortUrl.findFirst({
			where: eq(this.table.id, id),
			with: {
				customDomain: true,
			},
		});
		return result;
	}

	/**
	 * Finds a Short URL by its short code, including the custom domain name.
	 * @param shortCode - The short code of the Short URL.
	 * @returns A promise that resolves to the Short URL if found, otherwise undefined.
	 */
	async findOneByShortCode(shortCode: string): Promise<TShortUrlWithDomain | undefined> {
		const result = await this.db.query.shortUrl.findFirst({
			where: eq(this.table.shortCode, shortCode),
			with: {
				customDomain: true,
			},
		});
		return result;
	}

	/**
	 * Finds a Short URL by its QR code ID, including the custom domain name.
	 * @param qrCodeId - The QR code ID of the Short URL.
	 * @returns A promise that resolves to the Short URL if found, otherwise undefined.
	 */
	async findOneByQrCodeId(qrCodeId: string): Promise<TShortUrlWithDomain | undefined> {
		const result = await this.db.query.shortUrl.findFirst({
			where: eq(this.table.qrCodeId, qrCodeId),
			with: {
				customDomain: true,
			},
		});
		return result;
	}

	/**
	 * Finds all Short URLs with custom domain, supporting standalone filter.
	 * @param options - Query options including standalone flag.
	 * @returns A promise that resolves to an array of Short URLs with domain info.
	 */
	async findAllWithDomain({
		limit,
		page,
		where,
		standalone,
		tagIds,
	}: ISqlQueryFindBy<TShortUrl> & { standalone?: boolean; tagIds?: string[] }): Promise<
		TShortUrlWithDomain[]
	> {
		const conditions = this.buildFilterConditions(where, standalone, tagIds);

		const safePage = Math.max(0, (page || 1) - 1);
		const results = await this.db.query.shortUrl.findMany({
			where: and(...conditions),
			with: { customDomain: true },
			orderBy: [desc(this.table.createdAt)],
			limit: limit || 10,
			offset: safePage * (limit || 10),
		});

		return results as TShortUrlWithDomain[];
	}

	/**
	 * Counts total short URLs matching the given filters.
	 * @param where - Where conditions.
	 * @param standalone - If true, only count standalone short URLs.
	 * @returns The count of matching short URLs.
	 */
	async countTotalFiltered(
		where?: WhereConditions<TShortUrl>,
		standalone?: boolean,
		tagIds?: string[],
	): Promise<number> {
		const conditions = this.buildFilterConditions(where, standalone, tagIds);

		const result = await this.db
			.select({ count: sql<number>`count(${this.table.id})` })
			.from(this.table)
			.where(and(...conditions))
			.execute();

		return result[0]?.count || 0;
	}

	/**
	 * Updates a Short URL with the provided updates.
	 * @param shortUrl - The Short URL to update.
	 * @param updates - The updates to apply to the Short URL.
	 */
	async update(shortUrl: TShortUrl, updates: Partial<TShortUrl>): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, shortUrl.id));
	}

	/**
	 * Deletes a Short URL.
	 * @param shortUrl - The Short URL to delete.
	 * @returns A promise that resolves to true if the Short URL was deleted successfully.
	 */
	async delete(shortUrl: TShortUrl): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, shortUrl.id)).execute();
		await this.clearCache();
		return true;
	}

	/**
	 * Creates a new Short URL.
	 * @param shortUrl - The Short URL to create.
	 */
	async create(shortUrl: Omit<TShortUrl, 'createdAt' | 'updatedAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: shortUrl.id,
				name: shortUrl.name,
				destinationUrl: shortUrl.destinationUrl,
				shortCode: shortUrl.shortCode,
				isActive: shortUrl.isActive,
				customDomainId: shortUrl.customDomainId,
				createdAt: new Date(),
				createdBy: shortUrl.createdBy,
			})
			.execute();

		await this.clearCache();
	}

	/**
	 * Generates a new UUIDv4 ID.
	 * @returns a promise that resolves to the generated ID.
	 */
	async generateShortCode(): Promise<string> {
		const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
		let shortCode: string;

		while (true) {
			shortCode = Array.from({ length: 5 }, () =>
				characters.charAt(Math.floor(Math.random() * characters.length)),
			).join('');

			const existing = await this.db
				.select()
				.from(this.table)
				.where(eq(this.table.shortCode, shortCode))
				.execute();

			if (existing.length === 0) {
				break;
			}
		}

		return shortCode;
	}
}

export default ShortUrlRepository;
