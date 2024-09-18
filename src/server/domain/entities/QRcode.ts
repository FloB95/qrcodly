import { type TQRcodeResponseDto } from "../dtos/qrcode/TQRcodeResponseDto";
import {
  type TQrCodeContentOriginalDataMap,
  type TQrCodeContentType,
  type TQRcodeOptions,
} from "../types/QRcode";
import { BaseEntity } from "./BaseEntity";

/**
 * Represents a QR code entity.
 */
export class QRcode extends BaseEntity {
  /**
   * Constructs a QR code entity.
   * @param {string} id - The ID of the QR code.
   * @param {TQRcodeOptions} config - The configuration options for generating the QR code.
   * @param {string|null} createdBy - The user ID who created the QR code.
   */
  constructor(
    public readonly id: string,
    // public name: string,
    public config: TQRcodeOptions,
    public createdBy?: string | null,
  ) {
    super(id);
  }

  getContentType(): string {
    return this.config.contentType.type;
  }

  // TODO don't require t to be specified use current contentType
  getOriginalData<
    T extends TQrCodeContentType,
  >(): TQrCodeContentOriginalDataMap[T] {
    return this.config.originalData as TQrCodeContentOriginalDataMap[T];
  }

  // TODO for frontend class generation maybe use a different way
  static fromDTO(json: TQRcodeResponseDto): QRcode {
    const q = new QRcode(json.id, json.config, json.createdBy);
    q.createdAt = json.createdAt;
    q.updatedAt = json.updatedAt;
    return q;
  }
}
