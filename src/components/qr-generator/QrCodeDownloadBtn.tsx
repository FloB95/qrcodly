/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { api } from "~/lib/trpc/react";
import { Button } from "../ui/button";
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
import { useEffect, useState } from "react";

let QRCodeStyling: any;
const QrCodeDownloadBtn = ({
  qrCodeSettings,
  saveOnDownload = false,
  noStyling = false,
}: {
  qrCodeSettings: TQRcodeOptions;
  saveOnDownload?: boolean;
  noStyling?: boolean;
}) => {
  const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
  const apiUtils = api.useUtils();
  const createQrCode = api.qrCode.create.useMutation();

  useEffect(() => {
    // Dynamically import the QRCodeStyling class only when the component mounts
    import("qr-code-styling").then((module) => {
      QRCodeStyling = module.default;
      const qrCode = new QRCodeStyling(qrCodeSettings); // Create a new instance with the current settings
      setQrCodeInstance(qrCode); // Store the instance in the state
    });
  }, [qrCodeSettings]);

  const onDownloadClick = async (fileExt: TFileExtension) => {
    if (!qrCodeInstance) return;

    if (saveOnDownload) {
      try {
        await createQrCode.mutateAsync(
          { config: qrCodeSettings },
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
      } catch (error) {}
    }

    await qrCodeInstance.download({
      name: "qr-code",
      extension: fileExt,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        disabled={qrCodeSettings.data.length <= 0 || createQrCode.isPending}
      >
        {noStyling ? (
          <div className="cursor-pointer">Download</div>
        ) : (
          <Button
            isLoading={createQrCode.isPending}
            disabled={qrCodeSettings.data.length <= 0 || createQrCode.isPending}
          >
            Download
          </Button>
        )}
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
