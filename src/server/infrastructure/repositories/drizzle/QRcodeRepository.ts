import { qrCodeTable } from "~/server/infrastructure/db/drizzle/schema";
import { BaseRepository } from "./BaseRepository";
import { QRcode } from "~/server/domain/entities/QRcode";
import { type IQRcodeRepository } from "~/server/application/repositories/IQRcodeRepository";
import { db } from "~/server/infrastructure/db/drizzle";
import { desc, eq } from "drizzle-orm";

type NewQrCode = typeof qrCodeTable.$inferInsert;
type DbQrCode = typeof qrCodeTable.$inferSelect;

/**
 * Repository for managing QRcode Database entities.
 * Inherits from BaseRepository and implements IQRcodeRepository interface.
 */
class QRcodeRepository
  extends BaseRepository<QRcode>
  implements IQRcodeRepository
{
  table = qrCodeTable;

  findAll(): Promise<QRcode[]> {
    throw new Error("Method not implemented.");
  }

  async findOneById(id: string): Promise<QRcode | undefined> {
    const qrCode = await db.query.qrCodeTable.findFirst({
      where: eq(this.table.id, id),
    });
    return qrCode ? QRcodeRepository.mapDbEntryToQRcode(qrCode) : undefined;
  }

  async findByUserId(userId: string): Promise<QRcode[]> {
    const qrCodes = await db.query.qrCodeTable.findMany({
      where: eq(this.table.createdBy, userId),
      orderBy: desc(this.table.createdAt),
    });
    return qrCodes.map((dbQRcode) =>
      QRcodeRepository.mapDbEntryToQRcode(dbQRcode),
    );
  }

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

  update(entity: QRcode): Promise<void> {
    throw new Error("Method not implemented.");
  }

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
