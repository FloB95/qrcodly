import { singleton } from 'tsyringe';
import { desc, eq } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import qrCodeShare, {
	TQrCodeShare,
	TQrCodeShareWithQrCode,
} from '../entities/qr-code-share.entity';

/**
 * Repository for managing QR Code Share entities.
 */
@singleton()
class QrCodeShareRepository extends AbstractRepository<TQrCodeShare> {
	table = qrCodeShare;

	constructor() {
		super();
	}

	/**
	 * Finds all QR Code Shares based on the provided query parameters.
	 * @param options - Query options.
	 * @returns A promise that resolves to an array of QR Code Shares.
	 */
	async findAll({ limit, page, where }: ISqlQueryFindBy<TQrCodeShare>): Promise<TQrCodeShare[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);

		return await query.execute();
	}

	/**
	 * Finds a QR Code Share by its ID.
	 * @param id - The ID of the share.
	 * @returns A promise that resolves to the QR Code Share if found, otherwise undefined.
	 */
	async findOneById(id: string): Promise<TQrCodeShare | undefined> {
		const result = await this.db.query.qrCodeShare.findFirst({
			where: eq(this.table.id, id),
		});
		return result;
	}

	/**
	 * Finds a QR Code Share by its QR code ID.
	 * @param qrCodeId - The ID of the QR code.
	 * @returns A promise that resolves to the QR Code Share if found, otherwise undefined.
	 */
	async findByQrCodeId(qrCodeId: string): Promise<TQrCodeShare | undefined> {
		const result = await this.db.query.qrCodeShare.findFirst({
			where: eq(this.table.qrCodeId, qrCodeId),
		});
		return result;
	}

	/**
	 * Finds a QR Code Share by its share token, including the QR code.
	 * @param shareToken - The share token.
	 * @returns A promise that resolves to the QR Code Share with QR code if found, otherwise undefined.
	 */
	async findByShareToken(shareToken: string): Promise<TQrCodeShareWithQrCode | undefined> {
		const result = await this.db.query.qrCodeShare.findFirst({
			where: eq(this.table.shareToken, shareToken),
			with: {
				qrCode: true,
			},
		});
		return result as TQrCodeShareWithQrCode | undefined;
	}

	/**
	 * Creates a new QR Code Share.
	 * @param share - The QR Code Share to create.
	 */
	async create(share: Omit<TQrCodeShare, 'createdAt' | 'updatedAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: share.id,
				qrCodeId: share.qrCodeId,
				shareToken: share.shareToken,
				config: share.config,
				isActive: share.isActive,
				createdBy: share.createdBy,
				createdAt: new Date(),
			})
			.execute();

		await this.clearCache();
	}

	/**
	 * Updates a QR Code Share with the provided updates.
	 * @param share - The QR Code Share to update.
	 * @param updates - The updates to apply.
	 */
	async update(share: TQrCodeShare, updates: Partial<TQrCodeShare>): Promise<void> {
		await this.db
			.update(this.table)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(this.table.id, share.id))
			.execute();
	}
	/**
	 * Deletes a QR Code Share.
	 * @param share - The QR Code Share to delete.
	 * @returns A promise that resolves to true if deleted successfully.
	 */
	async delete(share: TQrCodeShare): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, share.id)).execute();
		await this.clearCache();
		return true;
	}
}

export default QrCodeShareRepository;
