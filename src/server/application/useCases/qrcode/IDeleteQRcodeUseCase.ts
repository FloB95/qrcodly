import { type QRcode } from "~/server/domain/entities/QRcode";
import { type IBaseUseCase } from "../IBaseUseCase";

/**
 * Interface for the Create QRcode Use Case.
 */
export interface IDeleteQRcodeUseCase extends IBaseUseCase {
  /**
   * Executes the Create QRcode Use Case.
   * @param qrCode The qrCode data to create a new qrCode.
   * @param deletedBy The ID of the user who is deleting the QRcode.
   * @returns The created qrCode.
   */
  execute(qrCode: QRcode, deletedBy: string): Promise<boolean>;
}
