"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import QRCodeStyling from "qr-code-styling";
import { api } from "~/lib/trpc/react";
import { Loader2 } from "lucide-react";
import {
  type TFileExtension,
  type TQRcodeOptions,
} from "~/server/domain/types/QRcode";
import { toast } from "../ui/use-toast";

export type QrCodeProps = {
  settings: TQRcodeOptions;
};

export default function QrCode({ settings }: QrCodeProps) {
  const options = settings;

  const createQrCode = api.qrCode.create.useMutation();
  const [fileExt, setFileExt] = useState<TFileExtension>("svg");
  const [qrCode] = useState<QRCodeStyling>(new QRCodeStyling(options));

  const [isDownloading, setIsDownloading] = useState(false);
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
      data: options.data || "https://qrcodly.com",
    });
  }, [qrCode, options]);

  const onExtensionChange = (ext: string) => {
    setFileExt(ext as TFileExtension);
  };

  const onDownloadClick = async () => {
    if (!qrCode) return;
    setIsDownloading(true);
    await createQrCode.mutateAsync(
      { config: options },
      {
        onSuccess: (data) => {
          // if user is logged in, show toast
          if (data.success && data.isStored) {
            // show toast
            toast({
              title: "New QR code created",
              description:
                "We saved your QR code in your dashboard for later use.",
              duration: 10000,
            });
          }
        },
      },
    );
    await qrCode.download({
      name: "qr-code",
      extension: fileExt,
    });

    setIsDownloading(false);
  };

  return (
    <div className="flex space-y-6 md:flex-col">
      <div
        className="canvas-wrap max-h-[200px] max-w-[200px] lg:max-h-[300px] lg:max-w-[300px]"
        ref={ref}
      />
      <div className="flex flex-col space-y-4 p-8 md:flex-row md:justify-between md:space-x-4 md:space-y-0 md:p-0">
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
          {!isDownloading ? (
            <Button
              disabled={options.data.length <= 0}
              onClick={onDownloadClick}
            >
              Download
            </Button>
          ) : (
            <Button disabled>
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Download
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
