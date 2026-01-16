import { singleton } from 'tsyringe';
import { desc, eq } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import shortUrl, { TShortUrl, TShortUrlWithDomain } from '../entities/short-url.entity';

/**
 * Repository for managing Short URL entities.
 */
@singleton()
class ShortUrlRepository extends AbstractRepository<TShortUrl> {
	table = shortUrl;

	constructor() {
		super();
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
