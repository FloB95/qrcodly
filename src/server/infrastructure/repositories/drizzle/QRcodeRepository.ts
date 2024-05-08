import { qrCodeTable } from "~/server/infrastructure/db/drizzle/schema";
import { BaseRepository } from "./BaseRepository";
import { QRcode } from "~/server/domain/entities/QRcode";
import { type IQRcodeRepository } from "~/server/application/repositories/IQRcodeRepository";
import { db } from "~/server/infrastructure/db/drizzle";
import { desc, eq } from "drizzle-orm";

type NewQrCode = typeof qrCodeTable.$inferInsert;
type DbQrCode = typeof qrCodeTable.$inferSelect;

/**
 * Repository for managing QRcode entities.
 * Inherits from BaseRepository and implements IQRcodeRepository interface.
 */
class QRcodeRepository
  extends BaseRepository<QRcode>
  implements IQRcodeRepository
{
  table = qrCodeTable;

  /**
   * Finds all QRcode entities in the database.
   * @returns A promise containing an array of QRcode instances.
   */
  findAll(): Promise<QRcode[]> {
    throw new Error("Method not implemented.");
  }

  /**
   * Finds a single QRcode entity by its ID.
   * @param id The ID of the QRcode to find.
   * @returns A promise containing the QRcode found, or undefined if no QRcode is found.
   */
  async findOneById(id: string): Promise<QRcode | undefined> {
    const qrCode = await db.query.qrCodeTable.findFirst({
      where: eq(this.table.id, id),
    });
    return qrCode ? QRcodeRepository.mapDbEntryToQRcode(qrCode) : undefined;
  }

  /**
   * Finds all QRcodes created by a specific user.
   * @param userId The ID of the User.
   * @returns A Promise that resolves to an array of QRcodes.
   */
  async findByUserId(userId: string): Promise<QRcode[]> {
    const qrCodes = await db.query.qrCodeTable.findMany({
      where: eq(this.table.createdBy, userId),
      orderBy: desc(this.table.createdAt),
    });
    return qrCodes.map((dbQRcode) =>
      QRcodeRepository.mapDbEntryToQRcode(dbQRcode),
    );
  }

  /**
   * Creates a new QRcode entity in the database.
   * @param entity The QRcode entity to create.
   * @returns A promise resolved once the QRcode has been created.
   */
  async create(entity: QRcode): Promise<void> {
    await db
      .insert(this.table)
      .values({
        id: entity.id,
        config: entity.config,
        createdAt: entity.createdAt,
        createdBy: entity.createdBy,
        updatedAt: entity.updatedAt,
      } as NewQrCode)
      .execute();
  }

  /**
   * Updates a QRcode entity in the database.
   * @param entity The QRcode entity to update.
   * @returns A promise resolved once the QRcode has been updated.
   */
  update(entity: QRcode): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Deletes a QRcode entity from the database.
   * @param entity The QRcode to delete.
   * @returns A promise resolved with a boolean indicating whether the delete was successful.
   */
  delete(entity: QRcode): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  /**
   * Converts a database QRcode entry to a domain QRcode entity.
   * @param dbQRcode The database QRcode entry.
   * @returns The domain QRcode entity.
   */
  public static mapDbEntryToQRcode(dbQRcode: DbQrCode): QRcode {
    const qrCode = new QRcode(dbQRcode.id, dbQRcode.config, dbQRcode.createdBy);
    qrCode.setCreatedAt(dbQRcode.createdAt);
    qrCode.setUpdatedAt(dbQRcode.updatedAt);
    return qrCode;
  }
}

export default QRcodeRepository;
