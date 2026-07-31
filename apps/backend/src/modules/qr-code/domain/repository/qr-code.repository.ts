import { singleton } from 'tsyringe';
import { and, desc, eq, inArray, ne, sql, SQL } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy, type WhereConditions } from '@/core/interface/repository.interface';
import qrCode, { TQrCode, TQrCodeWithRelations } from '../entities/qr-code.entity';
import { shortUrl, qrCodeTag, tag } from '@/core/db/schemas';
import type { TShortUrlStatusFilter } from '@shared/schemas';
import { TShortUrl } from '@/modules/url-shortener/domain/entities/short-url.entity';
import { TQrCodeContentType, type TTag } from '@shared/schemas';
import { convertWhereConditionToDrizzle } from '@/core/db/utils';

type FindAllParams = ISqlQueryFindBy<TQrCode> & {
	contentType?: TQrCodeContentType[];
	tagIds?: string[];
	status?: TShortUrlStatusFilter;
};

/**
 * Repository for managing QR Code entities.
 */
@singleton()
class QrCodeRepository extends AbstractRepository<TQrCode> {
	table = qrCode;

	constructor() {
		super();
	}

	private contentTypeCondition(contentTypes: TQrCodeContentType[]): SQL {
		return inArray(sql`JSON_UNQUOTE(JSON_EXTRACT(${this.table.content}, '$.type'))`, contentTypes);
	}

	private tagIdsCondition(tagIds: string[]): SQL {
		return inArray(
			this.table.id,
			this.db
				.select({ qrCodeId: qrCodeTag.qrCodeId })
				.from(qrCodeTag)
				.where(inArray(qrCodeTag.tagId, tagIds)),
		);
	}

	private toWhereSql(where: WhereConditions<TQrCode> | SQL<TQrCode>): SQL | undefined {
		return where instanceof SQL
			? where
			: convertWhereConditionToDrizzle<TQrCode>(where, this.table);
	}

	/**
	 * A QR code's state lives on its linked short URL, so the filter runs against the joined row.
	 * Static QR codes have no short URL and therefore never match a status filter.
	 */
	private statusCondition(status: TShortUrlStatusFilter): SQL | undefined {
		if (status === 'blocked') return eq(shortUrl.safetyStatus, 'blocked');
		if (status === 'active')
			return and(eq(shortUrl.isActive, true), ne(shortUrl.safetyStatus, 'blocked'));
		if (status === 'disabled')
			return and(eq(shortUrl.isActive, false), ne(shortUrl.safetyStatus, 'blocked'));
		return undefined;
	}

	async findAll({
		limit,
		page,
		where,
		contentType,
		tagIds,
		status,
	}: FindAllParams): Promise<TQrCodeWithRelations[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		query.leftJoin(shortUrl, eq(this.table.id, shortUrl.qrCodeId)).$dynamic();

		const conditions: SQL[] = [];
		if (where) {
			const whereSql = this.toWhereSql(where);
			if (whereSql) conditions.push(whereSql);
		}
		if (contentType?.length) {
			conditions.push(this.contentTypeCondition(contentType));
		}
		if (tagIds?.length) {
			conditions.push(this.tagIdsCondition(tagIds));
		}
		if (status) {
			const statusSql = this.statusCondition(status);
			if (statusSql) conditions.push(statusSql);
		}
		if (conditions.length > 0) {
			query.where(and(...conditions));
		}

		void this.withPagination(query, page, limit);

		const qrCodes = (await query.execute()) as unknown as {
			qr_code: TQrCode;
			short_url: TShortUrl | null;
		}[];

		const qrCodeIds = qrCodes.map((row) => row.qr_code.id);
		const tagsMap = qrCodeIds.length > 0 ? await this.getTagsForQrCodes(qrCodeIds) : new Map();

		const qrCodesWithRelations = qrCodes.map((row) => {
			return {
				...row.qr_code,
				shortUrl: row.short_url,
				tags: tagsMap.get(row.qr_code.id) ?? [],
			} as TQrCodeWithRelations;
		});

		return qrCodesWithRelations;
	}

	private async getTagsForQrCodes(qrCodeIds: string[]): Promise<Map<string, TTag[]>> {
		const rows = await this.db
			.select({ qrCodeId: qrCodeTag.qrCodeId, tag })
			.from(qrCodeTag)
			.innerJoin(tag, eq(qrCodeTag.tagId, tag.id))
			.where(inArray(qrCodeTag.qrCodeId, qrCodeIds))
			.execute();

		const map = new Map<string, TTag[]>();
		for (const row of rows) {
			const existing = map.get(row.qrCodeId) ?? [];
			existing.push(row.tag as unknown as TTag);
			map.set(row.qrCodeId, existing);
		}
		return map;
	}

	/**
	 * Finds a QR code by its ID.
	 * @param id - The ID of the QR code.
	 * @returns A promise that resolves to the QR code if found, otherwise undefined.
	 */
	async findOneById(id: string): Promise<TQrCodeWithRelations | undefined> {
		const qrCode = await this.db.query.qrCode.findFirst({
			where: eq(this.table.id, id),
			with: {
				shortUrl: true,
				share: true,
			},
		});
		if (!qrCode) return undefined;

		const tagRows = await this.db
			.select({ tag })
			.from(qrCodeTag)
			.innerJoin(tag, eq(qrCodeTag.tagId, tag.id))
			.where(eq(qrCodeTag.qrCodeId, id))
			.execute();

		return {
			...qrCode,
			tags: tagRows.map((r) => r.tag as unknown as TTag),
		} as unknown as TQrCodeWithRelations;
	}

	/**
	 * Updates a QR code with the provided updates.
	 * @param qrCode - The QR code to update.
	 * @param updates - The updates to apply to the QR code.
	 */
	async update(qrCode: TQrCode, updates: Partial<TQrCode>): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, qrCode.id));
	}

	/**
	 * Deletes a QR code.
	 * @param qrCode - The QR code to delete.
	 * @returns A promise that resolves to true if the QR code was deleted successfully.
	 */
	async delete(qrCode: TQrCode): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, qrCode.id)).execute();
		await this.clearCache();
		return true;
	}

	/**
	 * Creates a new QR code.
	 * @param qrCode - The QR code to create.
	 */
	async create(qrCode: Omit<TQrCode, 'createdAt' | 'updatedAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: qrCode.id,
				name: qrCode.name,
				config: qrCode.config,
				content: qrCode.content,
				qrCodeData: qrCode.qrCodeData,
				createdAt: new Date(),
				createdBy: qrCode.createdBy,
			})
			.execute();

		await this.clearCache();
	}

	async countTotal(
		whereConditions?: WhereConditions<TQrCode> | SQL<TQrCode>,
		contentType?: TQrCodeContentType[],
		tagIds?: string[],
		status?: TShortUrlStatusFilter,
	): Promise<number> {
		if (!contentType?.length && !tagIds?.length && !status) {
			return super.countTotal(whereConditions);
		}

		const conditions: SQL[] = [];
		if (whereConditions) {
			const whereSql = this.toWhereSql(whereConditions);
			if (whereSql) conditions.push(whereSql);
		}
		if (contentType?.length) {
			conditions.push(this.contentTypeCondition(contentType));
		}
		if (tagIds?.length) {
			conditions.push(this.tagIdsCondition(tagIds));
		}

		const query = this.db
			.select({ count: sql<number>`count(${this.table.id})` })
			.from(this.table)
			.$dynamic();

		// the status lives on the linked short URL, so counting it needs the same join as findAll
		if (status) {
			query.leftJoin(shortUrl, eq(this.table.id, shortUrl.qrCodeId)).$dynamic();
			const statusSql = this.statusCondition(status);
			if (statusSql) conditions.push(statusSql);
		}

		query.where(and(...conditions));

		const result = await query.execute();
		return result[0]?.count || 0;
	}
}

export default QrCodeRepository;
