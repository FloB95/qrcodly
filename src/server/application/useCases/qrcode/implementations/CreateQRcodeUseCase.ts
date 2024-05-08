import { QRcode } from "~/server/domain/entities/QRcode";
import { type ICreateQRcodeUseCase } from "../ICreateQRcodeUseCase";
import { type ICreateQRcodeDto } from "~/server/domain/dtos/qrcode/ICreateQRcodeDto";
import QRcodeRepository from "~/server/infrastructure/repositories/drizzle/QRcodeRepository";

/**
 * Use case for creating a QRcode entity.
 */
export class CreateQRcodeUseCase implements ICreateQRcodeUseCase {
  /**
   * Executes the use case to create a new QRcode entity based on the given DTO.
   * @param dto The data transfer object containing the details for the QRcode to be created.
   * @returns A promise that resolves with the newly created QRcode entity.
   */
  async execute(dto: ICreateQRcodeDto): Promise<QRcode> {
    const repo = new QRcodeRepository();
    const newId = await repo.generateId();
    const qrCode = new QRcode(newId, dto.config, dto.createdBy);

    // Create the QR code entity in the database.
    await repo.create(qrCode);

    // Retrieve the created QR code entity from the database.
    const createdQrCode = await repo.findOneById(newId);

    if (!createdQrCode) throw new Error("Failed to create QR code");

    return createdQrCode;
  }
}
