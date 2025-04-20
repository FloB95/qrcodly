import { singleton } from 'tsyringe';
import { desc, eq } from 'drizzle-orm';
import db from '@/core/db';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import qrCode, { TQrCode } from '../entities/qr-code.entity';

/**
 * Repository for managing QR Code entities.
 */
@singleton()
class QrCodeRepository extends AbstractRepository<TQrCode> {
	table = qrCode;

	constructor() {
		super();
	}

	/**
	 * Finds all QR codes based on the provided query parameters.
	 * @param options - Query options.
	 * @returns A promise that resolves to an array of QR codes.
	 */
	async findAll({ limit, offset, where }: ISqlQueryFindBy<TQrCode>): Promise<TQrCode[]> {
		const query = db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		// add where conditions
		if (where) void this.withWhere(query, where);

		// add pagination
		void this.withPagination(query, offset, limit);
		const qrCodes = await query.execute();
		return qrCodes;
	}

	/**
	 * Finds a QR code by its ID.
	 * @param id - The ID of the QR code.
	 * @returns A promise that resolves to the QR code if found, otherwise undefined.
	 */
	async findOneById(id: string): Promise<TQrCode | undefined> {
		const qrCode = await db.query.qrCode.findFirst({
			where: eq(this.table.id, id),
		});
		return qrCode;
	}

	/**
	 * Updates a QR code with the provided updates.
	 * @param qrCode - The QR code to update.
	 * @param updates - The updates to apply to the QR code.
	 */
	async update(qrCode: TQrCode, updates: Partial<TQrCode>): Promise<void> {
		await db.update(this.table).set(updates).where(eq(this.table.id, qrCode.id));
	}

	/**
	 * Deletes a QR code.
	 * @param qrCode - The QR code to delete.
	 * @returns A promise that resolves to true if the QR code was deleted successfully.
	 */
	async delete(qrCode: TQrCode): Promise<boolean> {
		await db.delete(this.table).where(eq(this.table.id, qrCode.id)).execute();
		await this.clearCache();
		return true;
	}

	/**
	 * Creates a new QR code.
	 * @param qrCode - The QR code to create.
	 */
	async create(qrCode: Omit<TQrCode, 'createdAt' | 'updatedAt'>): Promise<void> {
		await db
			.insert(this.table)
			.values({
				id: qrCode.id,
				config: qrCode.config,
				contentType: qrCode.contentType,
				content: qrCode.content,
				createdAt: new Date(),
				createdBy: qrCode.createdBy,
			})
			.execute();

		await this.clearCache();
	}
}

export default QrCodeRepository;
