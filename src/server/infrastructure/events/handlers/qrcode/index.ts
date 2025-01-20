import { IEventEmitter } from "~/server/domain/events/IEventEmitter";
import { QRCodeCreatedEvent } from "~/server/domain/events/qrcode/QRCodeCreatedEvent";
import { QRCodeCreatedHandler } from "./QRCodeCreatedHandler";
import { logger } from "~/server/infrastructure/logger";

/**
 * Loads QRcode event handlers.
 * @param emitter The event emitter to attach the handlers to.
 */
export function loadQRcodeEvents(emitter: IEventEmitter) {
  // QRcode created event handler
  console.log("loading QRcode events");
  const qrCodeCreatedHandler = new QRCodeCreatedHandler(logger);
  emitter.on<QRCodeCreatedEvent>(QRCodeCreatedEvent.eventName, (e) =>
    qrCodeCreatedHandler.handle(e),
  );
}
