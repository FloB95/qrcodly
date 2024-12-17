import EventEmitter from "..";
import { loadQRcodeEvents } from "./qrcode";

/**
 * Loads event handlers.
 */
export function loadEventHandlers() {
  // load QRcode events
  loadQRcodeEvents(EventEmitter);
}
