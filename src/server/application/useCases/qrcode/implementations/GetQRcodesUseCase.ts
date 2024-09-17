import { type ISqlQueryFindBy } from "~/server/application/repositories/IBaseSqlRepository";
import {
  type IGetQRcodesUseCaseResponse,
  type IGetQRcodesUseCase,
} from "../IGetQRcodesUseCase";
import { type QRcode } from "~/server/domain/entities/QRcode";
import { type IQRcodeRepository } from "~/server/application/repositories/IQRcodeRepository";

/**
 * Use case for retrieving QR codes based on query parameters.
 */
export class GetQRcodesUseCase implements IGetQRcodesUseCase {
  constructor(private qrCodeRepository: IQRcodeRepository) {}

  /**
   * Executes the GetQRcodesUseCase.
   * @param {ISqlQueryFindBy<QRcode>} query The query parameters for finding QR codes.
   * @returns {Promise<IGetQRcodesUseCaseResponse>} The response containing QR codes and total count.
   */
  async execute({
    limit,
    offset: page,
    where,
  }: ISqlQueryFindBy<QRcode>): Promise<IGetQRcodesUseCaseResponse> {
    const offset = (page - 1) * limit;

    // Retrieve QR codes based on the query parameters
    const qrCodes = await this.qrCodeRepository.findAll({
      limit,
      offset,
      where,
    });

    // Count the total number of QR codes
    const total = await this.qrCodeRepository.countTotal();

    return {
      qrCodes,
      total,
    };
  }
}
