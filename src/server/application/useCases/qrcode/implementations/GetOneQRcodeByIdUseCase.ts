import { type IQRcodeRepository } from "~/server/application/repositories/IQRcodeRepository";
import { type IGetOneQRcodeByIdUseCase } from "../IGetOneQRcodeByIdUseCase";
import { type QRcode } from "~/server/domain/entities/QRcode";

/**
 * Use case for retrieving a QRcode entity by its ID.
 */
export class GetOneQRcodeByIdUseCase implements IGetOneQRcodeByIdUseCase {
  constructor(private qrCodeRepository: IQRcodeRepository) {}

  /**
   * Executes the use case to retrieve a QRcode entity by its ID.
   * @param id The ID of the QRcode to be retrieved.
   * @returns A promise that resolves with the QRcode entity if found, otherwise undefined.
   */
  async execute(id: string): Promise<QRcode | undefined> {
    return await this.qrCodeRepository.findOneById(id);
  }
}
