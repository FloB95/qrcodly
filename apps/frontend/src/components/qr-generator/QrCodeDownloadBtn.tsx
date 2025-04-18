/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import {
  convertQRCodeDataToStringByType,
  type TFileExtension,
  type TQrCodeContent,
  type TQrCodeContentType,
  type TQrCodeOptions,
} from "qrcodly-api-types";
import { convertQrCodeOptionsToLibraryOptions } from "@/lib/utils";

let QRCodeStyling: any;
const QrCodeDownloadBtn = ({
  qrCodeData,
  qrCodeSettings,
  saveOnDownload = false,
  noStyling = false,
}: {
  qrCodeData: {
    contentType: TQrCodeContentType;
    data: TQrCodeContent;
  };
  qrCodeSettings: TQrCodeOptions;
  saveOnDownload?: boolean;
  noStyling?: boolean;
}) => {
  const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
  useEffect(() => {
    // Dynamically import the QRCodeStyling class only when the component mounts
    import("qr-code-styling").then((module) => {
      QRCodeStyling = module.default;
      const qrCode = new QRCodeStyling({
        ...convertQrCodeOptionsToLibraryOptions(qrCodeSettings),
        data: convertQRCodeDataToStringByType(qrCodeData.data, qrCodeData.contentType),
      }); // Create a new instance with the current settings
      setQrCodeInstance(qrCode); // Store the instance in the state
    });
  }, [qrCodeSettings]);

  const onDownloadClick = async (fileExt: TFileExtension) => {
    if (!qrCodeInstance) return;

    if (saveOnDownload) {
      try {
        // await createQrCode.mutateAsync(
        //   {
        //     contentType: qrCodeData.contentType,
        //     data: qrCodeData.data,
        //     config: qrCodeSettings,
        //   },
        //   {
        //     onSuccess: (data) => {
        //       // if user is logged in, show toast
        //       if (data.success && data.isStored) {
        //         // show toast
        //         toast({
        //           title: "New QR code created",
        //           description:
        //             "We saved your QR Code in your dashboard for later use.",
        //           duration: 10000,
        //         });
        //       }
        //     },
        //   },
        // );

        posthog.capture("QRCodeCreated", {
          contentType: qrCodeData.contentType,
          data: qrCodeData.data,
        });

        // invalidate dashboard cache
        // await apiUtils.qrCode.getMyQrCodes.invalidate();
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
        // disabled={qrCodeSettings.data.length <= 0 || createQrCode.isPending}
      >
        {noStyling ? (
          <div className="cursor-pointer">Download</div>
        ) : (
          <Button
            // isLoading={createQrCode.isPending}
            // disabled={qrCodeSettings.data.length <= 0 || createQrCode.isPending}
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
