import { NextResponse } from "next/server";

import { QRCodeCanvas, type Options } from "@loskir/styled-qr-code-node";

export async function GET() {
  try {
    const options: Partial<Options> = {
      width: 400,
      height: 400,
      data: "https://www.facebook.com/",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1200px-Facebook_Logo_%282019%29.png",
      dotsOptions: {
        color: "#4267b2",
        type: "rounded",
      },
      backgroundOptions: {
        color: "#e9ebee",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 20,
      },
    };
    const qrCode = new QRCodeCanvas(options);
    const file = await qrCode.toDataUrl("png");

    return NextResponse.json({
      pnfFile: file,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 },
    );
  }
}
