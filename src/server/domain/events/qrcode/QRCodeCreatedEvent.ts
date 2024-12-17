import { QRcode } from "../../entities/QRcode";
import { BaseEvent } from "../BaseEvent";

/**
 * Event triggered when a QR code is created.
 */
export class QRCodeCreatedEvent extends BaseEvent {
  /**
   * The name of the event.
   */
  static readonly eventName = "QRCodeCreated";

  constructor(public readonly qrCode: QRcode) {
    super();
  }

  eventName(): string {
    return QRCodeCreatedEvent.eventName;
  }
}
