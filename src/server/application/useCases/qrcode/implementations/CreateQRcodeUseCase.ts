import { QRcode } from "~/server/domain/entities/QRcode";
import { type ICreateQRcodeUseCase } from "../ICreateQRcodeUseCase";
import { type TCreateQRcodeDto } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { type IQRcodeRepository } from "~/server/application/repositories/IQRcodeRepository";
import { type IBaseLogger } from "~/server/application/logger/IBaseLogger";
import { QrCodeDefaults } from "~/config/QrCodeDefaults";
import { convertQRCodeDataToStringByType } from "~/lib/utils";
import { IEventEmitter } from "~/server/domain/events/IEventEmitter";
import { QRCodeCreatedEvent } from "~/server/domain/events/qrcode/QRCodeCreatedEvent";
import { analytics } from "~/server/infrastructure/analytics";

/**
 * Use case for creating a QRcode entity.
 */
export class CreateQRcodeUseCase implements ICreateQRcodeUseCase {
  constructor(
    private qrCodeRepository: IQRcodeRepository,
    private logger: IBaseLogger,
    private eventEmitter: IEventEmitter,
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
      data: convertQRCodeDataToStringByType(dto.data, dto.contentType),
    };

    const qrCode = QRcode.create({
      id: newId,
      config: qrCodeConfig,
      contentType: dto.contentType,
      originalData: dto.data,
      createdBy,
    });

    // Create the QR code entity in the database.
    await this.qrCodeRepository.create(qrCode);

    // Retrieve the created QR code entity from the database.
    const createdQrCode = await this.qrCodeRepository.findOneById(newId);
    if (!createdQrCode) throw new Error("Failed to create QR code");

    // Emit the QRCodeCreatedEvent.
    const event = new QRCodeCreatedEvent(createdQrCode);
    this.eventEmitter.emit(event);

    this.logger.info("QR code created successfully", {
      id: createdQrCode.id,
      createdBy: createdQrCode.createdBy,
      content: createdQrCode.originalData,
    });
    
    return createdQrCode;
  }
}
