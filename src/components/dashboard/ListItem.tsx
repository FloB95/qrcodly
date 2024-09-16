"use client";

import { type QRcode } from "~/server/domain/entities/QRcode";
import QrCode from "../qr-generator/QrCode";
import QrCodeDownloadBtn from "../qr-generator/QrCodeDownloadBtn";
import QRCodeStyling from "qr-code-styling";

export const DashboardListItem = ({ qr }: { qr: QRcode }) => {
  return (
    <div className="flex justify-center space-x-8">
      <QrCode
        settings={qr.config}
        additionalStyles="max-h-[100px] max-w-[100px] lg:max-h-[100px] lg:max-w-[100px]"
      />
      <div>
        <p>{qr.config.data}</p>
      </div>
      <div>
        <QrCodeDownloadBtn qrCode={new QRCodeStyling(qr.config)} />
      </div>
    </div>
  );
};
