/* eslint-disable @typescript-eslint/no-unsafe-argument */
"use server";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// Import required modules
import "node-self"; // Required for `self` compatibility
import QRCodeStyling from "qr-code-styling-node";
import { JSDOM } from "jsdom"; // Correct the typo here (uppercase JSDOM)
import { QrCodeDefaults } from "~/config/QrCodeDefaults";

export const generateQRcode = async (options: any) => {
  // Initialize JSDOM to simulate a browser environment
  const dom = new JSDOM(); // Create a new JSDOM instance
  global.window = dom.window as any;
  global.self = global.window;
  global.document = global.window.document;
  global.XMLSerializer = global.window.XMLSerializer; // XMLSerializer is part of the JSDOM window

  // Create a new QR code styling instance
  const qrCode = new QRCodeStyling({
    jsdom: JSDOM,
    ...{
      ...QrCodeDefaults,
      ...options,
      type: "svg",
    },
  });

  // Generate the QR code in SVG format
  const svgBuffer = await qrCode.getRawData(options.fileType);

  if (!svgBuffer) return null;
  const svgData = Buffer.isBuffer(svgBuffer)
    ? svgBuffer.toString("utf-8")
    : null;

  return svgData;
};
