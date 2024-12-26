import { IBaseLogger } from "~/server/application/logger/IBaseLogger";
import { QRCodeCreatedEvent } from "~/server/domain/events/qrcode/QRCodeCreatedEvent";

/**
 * Handles the QRCodeCreatedEvent
 */
export class QRCodeCreatedHandler {
  private logger: IBaseLogger;

  constructor(logger: IBaseLogger) {
    this.logger = logger;
  }

  async handle(event: QRCodeCreatedEvent): Promise<void> {
    const qrCode = event.qrCode;
    this.logger.info("QR code created successfully", {
      id: qrCode.id,
      createdBy: qrCode.createdBy,
      content: qrCode.originalData,
    });
  }
}
