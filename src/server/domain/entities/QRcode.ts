import {
  TQrCodeContentOriginalDataMap,
  TQrCodeContentType,
  TQRcodeOptions,
} from "../types/QRcode";
import { BaseEntity } from "./BaseEntity";
import { TQRcodeResponseDto } from "../dtos/qrcode/TQRcodeResponseDto";

/**
 * Represents a QRcode entity.
 * @extends BaseEntity
 */
export class QRcode extends BaseEntity {
  private _config: TQRcodeOptions;
  private _contentType: TQrCodeContentType;
  private _originalData: TQrCodeContentOriginalDataMap[TQrCodeContentType];
  private _createdBy?: string | null;

  private constructor(
    id: string,
    config: TQRcodeOptions,
    contentType: TQrCodeContentType,
    originalData: TQrCodeContentOriginalDataMap[TQrCodeContentType],
    createdBy?: string | null,
    createdAt?: Date,
    updatedAt?: Date | null,
  ) {
    super(id);
    this._config = config;
    this._contentType = contentType;
    this._originalData = originalData;
    this._createdBy = createdBy ?? null;
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? null;
  }

  get config(): TQRcodeOptions {
    return this._config;
  }

  get contentType(): TQrCodeContentType {
    return this._contentType;
  }

  get originalData(): TQrCodeContentOriginalDataMap[TQrCodeContentType] {
    return this._originalData;
  }

  get createdBy(): string | null | undefined {
    return this._createdBy;
  }

  /**
   * Creates a QRcode instance from a DTO.
   *
   * @param {TQRcodeResponseDto} json - The DTO containing the QR code data.
   * @returns {QRcode} The created QRcode instance.
   */
  static fromDTO(json: TQRcodeResponseDto): QRcode {
    return new QRcode(
      json.id,
      json.config,
      json.contentType,
      json.originalData,
      json.createdBy,
      json.createdAt,
      json.updatedAt,
    );
  }

  /**
   * Creates a new QRcode instance.
   *
   * @param {Object} params - The parameters for creating the QR code.
   * @param {string} params.id - The ID of the QR code.
   * @param {TQRcodeOptions} params.config - The configuration options for generating the QR code.
   * @param {TQrCodeContentType} params.contentType - The content type of the QR code.
   * @param {TQrCodeContentOriginalDataMap[TQrCodeContentType]} params.originalData - The original data for the QR code.
   * @param {string | null} [params.createdBy] - The user ID who created the QR code.
   * @param {Date} [params.createdAt] - The date and time when the QR code was created.
   * @param {Date | null} [params.updatedAt] - The date and time when the QR code was last updated.
   * @returns {QRcode} The created QRcode instance.
   */
  static create(params: {
    id: string;
    config: TQRcodeOptions;
    contentType: TQrCodeContentType;
    originalData: TQrCodeContentOriginalDataMap[TQrCodeContentType];
    createdBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date | null;
  }): QRcode {
    return new QRcode(
      params.id,
      params.config,
      params.contentType,
      params.originalData,
      params.createdBy,
      params.createdAt,
      params.updatedAt,
    );
  }
}
