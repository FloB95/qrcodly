import { qrCodeConfigTemplateTable } from "~/server/infrastructure/db/drizzle/schema";
import { BaseRepository } from "./BaseRepository";
import { db } from "~/server/infrastructure/db/drizzle";
import { desc, eq } from "drizzle-orm";
import { convertMySqlColumnsToSelectObj } from "../../db/drizzle/utils";
import { getTableConfig } from "drizzle-orm/mysql-core";
import {
  type WhereConditions,
  type ISqlQueryFindBy,
} from "~/server/application/repositories/IBaseSqlRepository";
import { toSnakeCaseKeys } from "~/lib/utils";
import { IConfigTemplateRepository } from "~/server/application/repositories/IConfigTemplateRepository";
import { ConfigTemplate } from "~/server/domain/entities/ConfigTemplate";

type NewConfigTemplate = typeof qrCodeConfigTemplateTable.$inferInsert;
type DbConfigTemplate = typeof qrCodeConfigTemplateTable.$inferSelect;

/**
 * Repository for managing ConfigTemplate Database entities.
 * Inherits from BaseRepository and implements IConfigTemplateRepository interface.
 */
class ConfigTemplateRepository
  extends BaseRepository<ConfigTemplate>
  implements IConfigTemplateRepository
{
  table = qrCodeConfigTemplateTable;

  /**
   * Finds all ConfigTemplate entities with optional pagination and filtering.
   * @param param0 The query parameters including limit, offset, and where conditions.
   * @returns A promise that resolves to an array of ConfigTemplate entities.
   */
  async findAll({
    limit,
    offset,
    where,
  }: ISqlQueryFindBy<ConfigTemplate>): Promise<ConfigTemplate[]> {
    const allColumns = convertMySqlColumnsToSelectObj(
      getTableConfig(this.table).columns,
    );
    const query = db
      .select(allColumns)
      .from(this.table)
      .orderBy(desc(this.table.created_at))
      .$dynamic();

    // add where conditions
    if (where) {
      // convert where conditions to drizzle-orm format
      void this.withWhere(
        query,
        toSnakeCaseKeys(where) as WhereConditions<
          typeof qrCodeConfigTemplateTable
        >,
      );
    }

    // add pagination
    void this.withPagination(query, offset, limit);

    const configTemplates = (await query.execute()) as DbConfigTemplate[];
    return configTemplates.map((configTemplate) =>
      ConfigTemplateRepository.mapDbEntryToConfigTemplate(configTemplate),
    );
  }

  /**
   * Finds a ConfigTemplate entity by its ID.
   * @param id The ID of the ConfigTemplate entity.
   * @returns A promise that resolves to the ConfigTemplate entity or undefined if not found.
   */
  async findOneById(id: string): Promise<ConfigTemplate | undefined> {
    const configTemplate = await db.query.qrCodeConfigTemplateTable.findFirst({
      where: eq(this.table.id, id),
    });
    return configTemplate
      ? ConfigTemplateRepository.mapDbEntryToConfigTemplate(configTemplate)
      : undefined;
  }

  /**
   * Finds all ConfigTemplate entities created by a user.
   * @param userId The ID of the user that created the ConfigTemplate entities.
   * @returns A promise that resolves to an array of ConfigTemplate entities.
   */
  async findByUserId(userId: string): Promise<ConfigTemplate[]> {
    const configTemplates = await db.query.qrCodeConfigTemplateTable.findMany({
      where: eq(this.table.created_by, userId),
      orderBy: desc(this.table.created_at),
    });
    return configTemplates.map((dbConfigTemplate) =>
      ConfigTemplateRepository.mapDbEntryToConfigTemplate(dbConfigTemplate),
    );
  }

  /**
   * Creates a new ConfigTemplate entity in the database.
   * @param entity The ConfigTemplate entity to create.
   */
  async create(entity: ConfigTemplate): Promise<void> {
    await db
      .insert(this.table)
      .values({
        id: entity.id,
        name: entity.name,
        config: entity.config,
        created_at: entity.createdAt,
        created_by: entity.createdBy,
        updated_at: entity.updatedAt,
      } as NewConfigTemplate)
      .execute();
  }

  update(entity: ConfigTemplate): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Deletes a ConfigTemplate entity from the database.
   * @param entity The ConfigTemplate entity to delete.
   * @returns A promise that resolves to true if the entity was deleted.
   */
  async delete(entity: ConfigTemplate): Promise<boolean> {
    await db.delete(this.table).where(eq(this.table.id, entity.id)).execute();
    return true;
  }

  /**
   * Converts a database ConfigTemplate entry to a domain ConfigTemplate entity.
   * @param dbQRcode The database ConfigTemplate entry.
   * @returns The domain ConfigTemplate entity.
   */
  public static mapDbEntryToConfigTemplate(
    dbQRcode: DbConfigTemplate,
  ): ConfigTemplate {
    // Creating a new ConfigTemplate instance
    const qrCode = ConfigTemplate.create({
      id: dbQRcode.id,
      config: dbQRcode.config,
      name: dbQRcode.name,
      createdBy: dbQRcode.created_by,
      createdAt: dbQRcode.created_at,
      updatedAt: dbQRcode.updated_at,
    });
    return qrCode;
  }
}

export default ConfigTemplateRepository;
