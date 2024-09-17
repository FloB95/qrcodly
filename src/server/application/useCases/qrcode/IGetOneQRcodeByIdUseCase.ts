import { type QRcode } from "~/server/domain/entities/QRcode";
import { type IBaseUseCase } from "../IBaseUseCase";

/**
 * Interface for the Get One QR Code By ID Use Case.
 */
export interface IGetOneQRcodeByIdUseCase extends IBaseUseCase {
  /**
   * Executes the Get One QR Code By ID Use Case.
   * @param id The ID of the QR code to search for.
   * @returns The QR code if found, otherwise undefined.
   */
  execute(id: string): Promise<QRcode | undefined>;
}
