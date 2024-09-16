"use client";

import { api } from "~/lib/trpc/react";
import { Button } from "../ui/button";
import type QRCodeStyling from "qr-code-styling";
import { Loader2 } from "lucide-react";
import {
  type TQRcodeOptions,
  type TFileExtension,
} from "~/server/domain/types/QRcode";
import { toast } from "../ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const QrCodeDownloadBtn = ({
  qrCode,
  saveOnDownload = false,
}: {
  qrCode: QRCodeStyling;
  saveOnDownload?: boolean;
}) => {
  const apiUtils = api.useUtils();
  const createQrCode = api.qrCode.create.useMutation();
  const options = qrCode._options as TQRcodeOptions;

  const onDownloadClick = async (fileExt: TFileExtension) => {
    if (!qrCode) return;

    if (saveOnDownload) {
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

      // invalidate dashboard cache
      await apiUtils.qrCode.getMyQrCodes.invalidate();
    }

    await qrCode.download({
      name: "qr-code",
      extension: fileExt,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={options.data.length <= 0}>
        <Button
          isLoading={createQrCode.isPending}
          disabled={options.data.length <= 0 || createQrCode.isPending}
        >
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onDownloadClick("svg")}
          >
            <span>SVG</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onDownloadClick("jpeg")}
          >
            <span>JPG</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onDownloadClick("webp")}
          >
            <span>WEBP</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onDownloadClick("png")}
          >
            <span>PNG</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QrCodeDownloadBtn;
