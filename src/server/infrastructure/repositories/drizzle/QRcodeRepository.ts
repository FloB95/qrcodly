import { qrCodeTable } from "~/server/infrastructure/db/drizzle/schema";
import { BaseRepository } from "./BaseRepository";
import { QRcode } from "~/server/domain/entities/QRcode";
import { type IQRcodeRepository } from "~/server/application/repositories/IQRcodeRepository";
import { db } from "~/server/infrastructure/db/drizzle";
import { desc, eq } from "drizzle-orm";
import { convertMySqlColumnsToSelectObj } from "../../db/drizzle/utils";
import { getTableConfig } from "drizzle-orm/mysql-core";
import {
  type WhereConditions,
  type ISqlQueryFindBy,
} from "~/server/application/repositories/IBaseSqlRepository";

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

  async findAll({
    limit,
    offset,
    where,
  }: ISqlQueryFindBy<QRcode>): Promise<QRcode[]> {
    const allColumns = convertMySqlColumnsToSelectObj(
      getTableConfig(this.table).columns,
    );
    const query = db
      .select(allColumns)
      .from(this.table)
      .orderBy(desc(this.table.createdAt))
      .$dynamic();

    // add where conditions
    if (where)
      void this.withWhere(query, where as WhereConditions<typeof qrCodeTable>);

    // add pagination
    void this.withPagination(query, offset, limit);

    const qrCodes = (await query.execute()) as DbQrCode[];
    return qrCodes.map((qrCode) => QRcodeRepository.mapDbEntryToQRcode(qrCode));
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

  async delete(entity: QRcode): Promise<boolean> {
    await db.delete(this.table).where(eq(this.table.id, entity.id)).execute();
    return true;
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
