import { type QRcode } from "~/server/domain/entities/QRcode";
import {
  type ISqlQueryFindBy,
  type IBaseSqlRepository,
} from "./IBaseSqlRepository";

export interface IQRcodeRepository extends IBaseSqlRepository<QRcode> {
  /**
   * Finds all QRcodes based on the provided query parameters.
   * @param query An object containing query parameters like limit, offset, select, and where.
   * @returns A Promise that resolves to an array of QRcodes.
   */
  findAll(query: ISqlQueryFindBy<QRcode>): Promise<QRcode[]>;
}
