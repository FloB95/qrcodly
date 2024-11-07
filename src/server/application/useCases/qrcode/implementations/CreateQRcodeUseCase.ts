import { QRcode } from "~/server/domain/entities/QRcode";
import { type ICreateQRcodeUseCase } from "../ICreateQRcodeUseCase";
import { type TCreateQRcodeDto } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { type IQRcodeRepository } from "~/server/application/repositories/IQRcodeRepository";
import { type IBaseLogger } from "~/server/application/logger/IBaseLogger";
import { QrCodeDefaults } from "~/config/QrCodeDefaults";

/**
 * Use case for creating a QRcode entity.
 */
export class CreateQRcodeUseCase implements ICreateQRcodeUseCase {
  constructor(
    private qrCodeRepository: IQRcodeRepository,
    private logger: IBaseLogger,
  ) {}

  /**
   * Executes the use case to create a new QRcode entity based on the given DTO.
   * @param dto The data transfer object containing the details for the QRcode to be created.
   * @param createdBy The ID of the user who created the QRcode.
   * @returns A promise that resolves with the newly created QRcode entity.
   */
  async execute(dto: TCreateQRcodeDto, createdBy?: string): Promise<QRcode> {
    const newId = await this.qrCodeRepository.generateId();

    // merge dto with default qrcode config
    const qrCodeConfig = {
      ...QrCodeDefaults,
      ...dto.config,
    };

    const qrCode = new QRcode(newId, qrCodeConfig, createdBy);

    // Create the QR code entity in the database.
    await this.qrCodeRepository.create(qrCode);

    // Retrieve the created QR code entity from the database.
    const createdQrCode = await this.qrCodeRepository.findOneById(newId);

    if (!createdQrCode) throw new Error("Failed to create QR code");

    this.logger.info("QR code created successfully", {
      id: createdQrCode.id,
      createdBy: createdQrCode.createdBy,
      content: createdQrCode.getOriginalData(),
    });

    return createdQrCode;
  }
}
