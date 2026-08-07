import { singleton } from 'tsyringe';
import { and, asc, desc, eq, inArray, isNull, isNotNull, lte, ne, sql, SQL } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy, type WhereConditions } from '@/core/interface/repository.interface';
import shortUrl, {
	TShortUrl,
	TShortUrlCreateInput,
	TShortUrlWithDomain,
} from '../entities/short-url.entity';
import { convertWhereConditionToDrizzle } from '@/core/db/utils';
import shortUrlTag from '../entities/short-url-tag.entity';
import { minutesFromNow } from '@/core/utils/date';
import { URL_SAFETY_FIRST_CHECK_MINUTES } from '../../config/constants';
import type { TShortUrlSafetyStatus, TShortUrlStatusFilter } from '@shared/schemas';

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
		status?: TShortUrlStatusFilter,
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

		// "disabled" is the owner's own choice; "blocked" is ours and they cannot undo it
		if (status === 'active') {
			conditions.push(eq(this.table.isActive, true));
		} else if (status === 'disabled') {
			conditions.push(eq(this.table.isActive, false));
			conditions.push(ne(this.table.safetyStatus, 'blocked'));
		} else if (status === 'blocked') {
			conditions.push(eq(this.table.safetyStatus, 'blocked'));
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
		status,
	}: ISqlQueryFindBy<TShortUrl> & {
		standalone?: boolean;
		tagIds?: string[];
		status?: TShortUrlStatusFilter;
	}): Promise<TShortUrlWithDomain[]> {
		const conditions = this.buildFilterConditions(where, standalone, tagIds, status);

		const safePage = Math.max(0, (page || 1) - 1);
		const results = await this.db.query.shortUrl.findMany({
			where: and(...conditions),
			with: { customDomain: true },
			orderBy: [desc(this.table.createdAt)],
			limit: limit || 10,
			offset: safePage * (limit || 10),
		});

		return results;
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
		status?: TShortUrlStatusFilter,
	): Promise<number> {
		const conditions = this.buildFilterConditions(where, standalone, tagIds, status);

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
	 *
	 * `nextSafetyCheckAt` is derived here rather than taken from the caller: this insert lists its
	 * columns explicitly, so anything a call site forgets is silently dropped, and a link that never
	 * gets a due date would never be re-screened. Reserved codes have no destination yet and stay
	 * NULL until an update gives them one.
	 *
	 * @param shortUrl - The Short URL to create.
	 */
	async create(shortUrl: TShortUrlCreateInput): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: shortUrl.id,
				name: shortUrl.name,
				destinationUrl: shortUrl.destinationUrl,
				shortCode: shortUrl.shortCode,
				isActive: shortUrl.isActive,
				customDomainId: shortUrl.customDomainId,
				qrCodeId: shortUrl.qrCodeId,
				createdAt: new Date(),
				createdBy: shortUrl.createdBy,
				nextSafetyCheckAt: shortUrl.destinationUrl
					? minutesFromNow(URL_SAFETY_FIRST_CHECK_MINUTES)
					: null,
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

	// ---------------------------------------------------------------------------
	// URL safety re-check queue
	// ---------------------------------------------------------------------------

	/**
	 * Claims the next batch of links whose safety re-check is due, oldest due date first.
	 *
	 * Reserved codes are excluded: they have no destination to screen. Soft-deleted rows are too —
	 * a deleted link no longer redirects, so there is nothing to protect anyone from.
	 */
	async findDueForSafetyCheck(limit: number, now: Date = new Date()): Promise<TShortUrl[]> {
		return this.db
			.select()
			.from(this.table)
			.where(
				and(
					isNull(this.table.deletedAt),
					isNotNull(this.table.destinationUrl),
					isNotNull(this.table.nextSafetyCheckAt),
					lte(this.table.nextSafetyCheckAt, now),
				),
			)
			.orderBy(asc(this.table.nextSafetyCheckAt))
			.limit(limit)
			.execute();
	}

	/** Same predicate as {@link findDueForSafetyCheck}, for the backlog gauge. */
	async countDueForSafetyCheck(now: Date = new Date()): Promise<number> {
		const [row] = await this.db
			.select({ count: sql<number>`count(${this.table.id})` })
			.from(this.table)
			.where(
				and(
					isNull(this.table.deletedAt),
					isNotNull(this.table.destinationUrl),
					isNotNull(this.table.nextSafetyCheckAt),
					lte(this.table.nextSafetyCheckAt, now),
				),
			)
			.execute();
		return Number(row?.count ?? 0);
	}

	/**
	 * Pushes the due date forward for a whole batch *before* any lookup runs.
	 *
	 * AbstractCronJob releases its Redis lock without checking ownership, so a run that outlives the
	 * 600s TTL can overlap with its successor. Claiming up front means the two runs see disjoint
	 * batches instead of screening — and double-blocking — the same links.
	 */
	async claimForSafetyCheck(ids: string[], claimUntil: Date): Promise<void> {
		if (!ids.length) return;
		await this.db
			.update(this.table)
			.set({ nextSafetyCheckAt: claimUntil })
			.where(inArray(this.table.id, ids))
			.execute();
	}

	/** Records the outcome of a completed lookup and schedules the next one. */
	async markSafetyChecked(
		id: string,
		updates: {
			safetyStatus?: TShortUrlSafetyStatus;
			nextSafetyCheckAt: Date;
			safetyCheckFailures?: number;
			safetyPendingSince?: Date | null;
			safetyThreatTypes?: string | null;
		},
	): Promise<void> {
		await this.db
			.update(this.table)
			.set({ ...updates, lastSafetyCheckAt: new Date() })
			.where(eq(this.table.id, id))
			.execute();
	}

	/**
	 * Blocks a link: disables the redirect and marks it as ours to unblock.
	 *
	 * `isActive` and `safetyStatus` are set in one statement so a link can never be left flagged but
	 * still redirecting.
	 */
	async blockForSafety(id: string, threatTypes: string[], nextSafetyCheckAt: Date): Promise<void> {
		await this.db
			.update(this.table)
			.set({
				isActive: false,
				safetyStatus: 'blocked',
				safetyBlockedAt: new Date(),
				safetyThreatTypes: threatTypes.length ? threatTypes.join(',') : null,
				safetyPendingSince: null,
				safetyCheckFailures: 0,
				lastSafetyCheckAt: new Date(),
				nextSafetyCheckAt,
				updatedAt: new Date(),
			})
			.where(eq(this.table.id, id))
			.execute();
	}

	/**
	 * Lifts a block. `isActive` deliberately stays false: the owner has to consciously switch the
	 * link back on rather than have traffic silently resume.
	 */
	async clearSafetyBlock(id: string, nextSafetyCheckAt: Date): Promise<void> {
		await this.db
			.update(this.table)
			.set({
				safetyStatus: 'clean',
				safetyBlockedAt: null,
				safetyThreatTypes: null,
				safetyPendingSince: null,
				safetyCheckFailures: 0,
				lastSafetyCheckAt: new Date(),
				nextSafetyCheckAt,
				updatedAt: new Date(),
			})
			.where(eq(this.table.id, id))
			.execute();
	}

	/**
	 * Blocked links split by where the user can actually find them.
	 *
	 * A short URL owned by a dynamic QR code never appears in the short-URL list — that list is
	 * always queried with `standalone: true`, by design. Reporting one combined number would promise
	 * more rows than the list can show, so the two are counted separately and surfaced separately.
	 */
	async countBlockedForUser(userId: string): Promise<{
		standalone: number;
		qrLinked: number;
		total: number;
	}> {
		const [row] = await this.db
			.select({
				standalone: sql<number>`sum(case when ${this.table.qrCodeId} is null then 1 else 0 end)`,
				qrLinked: sql<number>`sum(case when ${this.table.qrCodeId} is not null then 1 else 0 end)`,
			})
			.from(this.table)
			.where(
				and(
					eq(this.table.createdBy, userId),
					eq(this.table.safetyStatus, 'blocked'),
					isNull(this.table.deletedAt),
				),
			)
			.execute();

		const standalone = Number(row?.standalone ?? 0);
		const qrLinked = Number(row?.qrLinked ?? 0);
		return { standalone, qrLinked, total: standalone + qrLinked };
	}
}

export default ShortUrlRepository;
