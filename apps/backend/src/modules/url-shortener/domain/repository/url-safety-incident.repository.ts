import { singleton } from 'tsyringe';
import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import urlSafetyIncident, { type TUrlSafetyIncident } from '../entities/url-safety-incident.entity';
import shortUrl from '../entities/short-url.entity';
import type { TUrlSafetyIncidentAction, TUrlSafetyIncidentSource } from '@shared/schemas';

export interface RecordIncidentParams {
	userId: string;
	shortUrlId: string | null;
	destinationHost: string;
	threatTypes: string[];
	source: TUrlSafetyIncidentSource;
	action: TUrlSafetyIncidentAction;
	countedAsOffence?: boolean;
}

/** An open incident enriched with the affected link, for the dashboard banner. */
export type TOpenIncident = TUrlSafetyIncident & {
	shortCode: string | null;
	name: string | null;
	/** Set when the blocked link belongs to a dynamic QR code, which lives in a different list. */
	qrCodeId: string | null;
};

@singleton()
export class UrlSafetyIncidentRepository extends AbstractRepository<TUrlSafetyIncident> {
	table = urlSafetyIncident;

	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TUrlSafetyIncident>): Promise<TUrlSafetyIncident[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();
		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);
		return query.execute();
	}

	async findOneById(id: string): Promise<TUrlSafetyIncident | undefined> {
		const [row] = await this.db
			.select()
			.from(this.table)
			.where(eq(this.table.id, id))
			.limit(1)
			.execute();
		return row;
	}

	async create(item: TUrlSafetyIncident): Promise<void> {
		await this.db.insert(this.table).values(item).execute();
		await this.clearCache();
	}

	async update(item: TUrlSafetyIncident, updates: Partial<TUrlSafetyIncident>): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, item.id)).execute();
	}

	async delete(item: TUrlSafetyIncident): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, item.id)).execute();
		await this.clearCache();
		return true;
	}

	/** Writes one finding. `destinationHost` must already be reduced to a hostname. */
	async record(params: RecordIncidentParams): Promise<TUrlSafetyIncident> {
		const row: TUrlSafetyIncident = {
			id: this.generateId(),
			userId: params.userId,
			shortUrlId: params.shortUrlId,
			destinationHost: params.destinationHost,
			threatTypes: params.threatTypes.length ? params.threatTypes.join(',') : null,
			source: params.source,
			action: params.action,
			countedAsOffence: params.countedAsOffence ?? true,
			acknowledgedAt: null,
			resolvedAt: null,
			createdAt: new Date(),
		};

		await this.create(row);
		return row;
	}

	/**
	 * Findings the user has neither dismissed nor had resolved, newest first, joined with the
	 * affected link so the banner can name it.
	 */
	async findOpenForUser(userId: string, limit = 20): Promise<TOpenIncident[]> {
		return this.db
			.select({
				id: this.table.id,
				userId: this.table.userId,
				shortUrlId: this.table.shortUrlId,
				destinationHost: this.table.destinationHost,
				threatTypes: this.table.threatTypes,
				source: this.table.source,
				action: this.table.action,
				countedAsOffence: this.table.countedAsOffence,
				acknowledgedAt: this.table.acknowledgedAt,
				resolvedAt: this.table.resolvedAt,
				createdAt: this.table.createdAt,
				shortCode: shortUrl.shortCode,
				name: shortUrl.name,
				qrCodeId: shortUrl.qrCodeId,
			})
			.from(this.table)
			.leftJoin(shortUrl, eq(this.table.shortUrlId, shortUrl.id))
			.where(
				and(
					eq(this.table.userId, userId),
					// Only findings that actually disabled a link. A `rejected` write was already refused
					// inline with an error, and `shadow` is an observation we deliberately did not act on
					// — surfacing either would tell the user links were blocked that never were.
					eq(this.table.action, 'blocked'),
					isNull(this.table.acknowledgedAt),
					isNull(this.table.resolvedAt),
				),
			)
			.orderBy(desc(this.table.createdAt))
			.limit(limit)
			.execute();
	}

	/** Marks every open finding as seen. Returns how many rows were touched. */
	async acknowledgeAllForUser(userId: string): Promise<number> {
		const open = await this.db
			.select({ id: this.table.id })
			.from(this.table)
			.where(
				and(
					eq(this.table.userId, userId),
					isNull(this.table.acknowledgedAt),
					isNull(this.table.resolvedAt),
				),
			)
			.execute();

		if (!open.length) return 0;

		await this.db
			.update(this.table)
			.set({ acknowledgedAt: new Date() })
			.where(
				inArray(
					this.table.id,
					open.map((row) => row.id),
				),
			)
			.execute();

		return open.length;
	}

	/** Closes the findings behind a block once it has been lifted. */
	async resolveForShortUrl(shortUrlId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({ resolvedAt: new Date() })
			.where(and(eq(this.table.shortUrlId, shortUrlId), isNull(this.table.resolvedAt)))
			.execute();
	}

	async countBlockedIncidentsForUser(userId: string): Promise<number> {
		const [row] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(this.table)
			.where(
				and(
					eq(this.table.userId, userId),
					eq(this.table.action, 'blocked'),
					isNull(this.table.resolvedAt),
				),
			)
			.execute();
		return Number(row?.count ?? 0);
	}

	/** Retention sweep, run at the end of each job pass. */
	async deleteOlderThan(cutoff: Date): Promise<number> {
		const stale = await this.db
			.select({ id: this.table.id })
			.from(this.table)
			.where(lt(this.table.createdAt, cutoff))
			.limit(1000)
			.execute();

		if (!stale.length) return 0;

		await this.db
			.delete(this.table)
			.where(
				inArray(
					this.table.id,
					stale.map((row) => row.id),
				),
			)
			.execute();

		await this.clearCache();
		return stale.length;
	}
}

export default UrlSafetyIncidentRepository;
