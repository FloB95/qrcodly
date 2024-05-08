import { type QRcode } from "~/server/domain/entities/QRcode";
import { type IBaseUseCase } from "../IBaseUseCase";
import { type ICreateQRcodeDto } from "~/server/domain/dtos/qrcode/ICreateQRcodeDto";

/**
 * Interface for the Create QRcode Use Case.
 */
export interface ICreateQRcodeUseCase extends IBaseUseCase {
  /**
   * Executes the Create QRcode Use Case.
   * @param qrCode The qrCode data to create a new qrCode.
   * @param createdBy The ID of the user who created the qrCode.
   * @returns The created qrCode.
   */
  execute(qrCode: ICreateQRcodeDto, createdBy?: string): Promise<QRcode>;
}
