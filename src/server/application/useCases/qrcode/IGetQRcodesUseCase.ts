import { type ISqlQueryFindBy } from "~/server/application/repositories/IBaseSqlRepository";
import { type QRcode } from "~/server/domain/entities/QRcode";

/**
 * Response type for the Get QR codes Use Case.
 * Contains an array of QR codes and the total count.
 */
export interface IGetQRcodesUseCaseResponse {
  qrCodes: QRcode[];
  total: number;
}

/**
 * Interface for the Get QR codes Use Case.
 */
export interface IGetQRcodesUseCase {
  /**
   * Executes the Get QR codes Use Case.
   * @param query The query parameters for finding QR codes.
   * @returns A promise that resolves to the response containing QR codes and total count.
   */
  execute(query: ISqlQueryFindBy<QRcode>): Promise<IGetQRcodesUseCaseResponse>;
}
