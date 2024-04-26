import { type TQRcodeOptions } from "../types/QRcode";
import { BaseEntity } from "./BaseEntity";

/**
 * Represents a QR code entity.
 */
export class QRcode extends BaseEntity {
  /**
   * Constructs a QR code entity.
   * @param {string} id - The ID of the QR code.
   * @param {TQRcodeOptions} config - The configuration options for generating the QR code.
   * @param {string} createdBy - The user who created the QR code.
   */
  constructor(
    public readonly id: string,
    public config: TQRcodeOptions,
    public createdBy?: string,
  ) {
    super(id);
  }
}
