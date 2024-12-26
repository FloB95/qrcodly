import { ConfigTemplate } from "~/server/domain/entities/ConfigTemplate";
import {
  type ISqlQueryFindBy,
  type IBaseSqlRepository,
} from "./IBaseSqlRepository";

export interface IConfigTemplateRepository
  extends IBaseSqlRepository<ConfigTemplate> {
  /**
   * Finds all ConfigTemplates based on the provided query parameters.
   * @param query An object containing query parameters like limit, offset, select, and where.
   * @returns A Promise that resolves to an array of ConfigTemplates.
   */
  findAll(query: ISqlQueryFindBy<ConfigTemplate>): Promise<ConfigTemplate[]>;

  /**
   * Finds all ConfigTemplates created by a specific user.
   * @param userId The ID of the User.
   * @returns A Promise that resolves to an array of ConfigTemplates.
   */
  findByUserId(userId: string): Promise<ConfigTemplate[]>;
}
