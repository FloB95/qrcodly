"use client";

import { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import { type TQRcodeOptions } from "~/server/domain/types/QRcode";
import { cn } from "~/lib/utils";

export type QrCodeProps = {
  settings: TQRcodeOptions;
  additionalStyles?: string;
};

export default function QrCode({
  settings,
  additionalStyles = "",
}: QrCodeProps) {
  const options = settings;
  const [qrCode] = useState<QRCodeStyling>(new QRCodeStyling(options));

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      qrCode.append(ref.current);
    }
  }, [qrCode, ref]);

  useEffect(() => {
    if (!qrCode) return;
    // set default data if not provided
    qrCode.update({
      ...options,
      data: options.data || "https://qrcodly.de",
    });
  }, [qrCode, options]);

  return (
    <div
      className={cn(
        "canvas-wrap max-h-[200px] max-w-[200px] lg:max-h-[300px] lg:max-w-[300px]",
        additionalStyles,
      )}
      ref={ref}
    />
  );
}
