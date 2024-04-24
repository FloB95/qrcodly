"use client";
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { useEffect, useRef, useState } from "react";
import QRCodeStyling, {
  type FileExtension,
  type Options,
} from "qr-code-styling";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export type QrCodeProps = {
  settings: Options;
};

export default function QrCode({ settings }: QrCodeProps) {
  const options = settings;

  // if no data set, set default data
  if (!options.data) {
    options.data = "https://www.qrcodly.de";
  }

  const [fileExt, setFileExt] = useState<FileExtension>("svg");
  const [qrCode] = useState<QRCodeStyling>(new QRCodeStyling(options));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      qrCode.append(ref.current);
    }
  }, [qrCode, ref]);

  useEffect(() => {
    if (!qrCode) return;
    qrCode.update(options);
  }, [qrCode, options]);

  const onExtensionChange = (ext: string) => {
    setFileExt(ext as FileExtension);
  };

  const onDownloadClick = () => {
    if (!qrCode) return;
    void qrCode.download({
      name: "qr-code",
      extension: fileExt,
    });
  };

  return (
    <div className="flex p-12 md:flex-col">
      <div
        className="canvas-wrap max-h-[200px] max-w-[200px] lg:max-h-[300px] lg:max-w-[300px]"
        ref={ref}
      />
      <div className="mt-8 flex flex-col space-y-4 p-8 md:flex-row md:justify-between md:space-x-4 md:p-0 md:space-y-0">
        <Select onValueChange={onExtensionChange} value={fileExt}>
          <SelectTrigger className="lg:w-[160px]">
            <SelectValue placeholder="Select filetype" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="svg">SVG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpeg">JPEG</SelectItem>
            <SelectItem value="webp">WEBP</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex justify-end">
          <Button onClick={onDownloadClick}>Download</Button>
        </div>
      </div>
    </div>
  );
}
