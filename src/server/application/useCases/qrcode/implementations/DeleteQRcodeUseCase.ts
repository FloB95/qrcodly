import { type IQRcodeRepository } from "~/server/application/repositories/IQRcodeRepository";
import { type QRcode } from "~/server/domain/entities/QRcode";
import { type IDeleteQRcodeUseCase } from "../IDeleteQRcodeUseCase";
import { type IBaseLogger } from "~/server/application/logger/IBaseLogger";

/**
 * Use case for deleting a QRcode entity.
 */
export class DeleteQRcodeUseCase implements IDeleteQRcodeUseCase {
  constructor(
    private qrCodeRepository: IQRcodeRepository,
    private logger: IBaseLogger,
  ) {}

  /**
   * Executes the use case to delete a QRcode entity.
   * @param qrCode The QRcode entity to be deleted.
   * @returns A promise that resolves to true if the deletion was successful, otherwise false.
   */
  async execute(qrCode: QRcode, deletedBy: string): Promise<boolean> {
    const res = await this.qrCodeRepository.delete(qrCode);

    // log the deletion
    if (res) {
      this.logger.info("QR code deleted successfully", {
        id: qrCode.id,
        deletedBy: deletedBy,
      });
    } else {
      this.logger.warn("Failed to delete QR code", {
        id: qrCode.id,
      });
    }

    return res;
  }
}
