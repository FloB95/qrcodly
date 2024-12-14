"use client";

import { api } from "~/lib/trpc/react";
import { Button } from "../ui/button";
import {
  type TQRcodeOptions,
  type TFileExtension,
  type TQrCodeContentType,
  type TQrCodeContentOriginalData,
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
import type QRCodeStyling from "qr-code-styling";

const QrCodeDownloadBtn = ({
  qrCodeData,
  qrCodeSettings,
  saveOnDownload = false,
  noStyling = false,
}: {
  qrCodeData: {
    contentType: TQrCodeContentType;
    data: TQrCodeContentOriginalData;
  };
  qrCodeSettings: TQRcodeOptions;
  saveOnDownload?: boolean;
  noStyling?: boolean;
}) => {
  const [qrCodeInstance, setQrCodeInstance] = useState<QRCodeStyling | null>(
    null,
  );
  const apiUtils = api.useUtils();
  const createQrCode = api.qrCode.create.useMutation();

  useEffect(() => {
    let isMounted = true;

    const initializeQRCode = async () => {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      if (isMounted) {
        const qrCode = new QRCodeStyling(qrCodeSettings);
        setQrCodeInstance(qrCode);
      }
    };

    void initializeQRCode();

    return () => {
      isMounted = false;
    };
  }, [qrCodeSettings]);

  const onDownloadClick = async (fileExt: TFileExtension) => {
    if (!qrCodeInstance) return;

    if (saveOnDownload) {
      try {
        const result = await createQrCode.mutateAsync({
          contentType: qrCodeData.contentType,
          data: qrCodeData.data,
          config: qrCodeSettings,
        });

        if (result.success && result.isStored) {
          toast({
            title: "New QR code created",
            description:
              "We saved your QR code in your dashboard for later use.",
            duration: 10000,
          });
        }

        await apiUtils.qrCode.getMyQrCodes.invalidate();
      } catch (error) {
        console.error("Failed to save QR code", error);
      }
    }

    try {
      await qrCodeInstance.download({
        name: "qr-code",
        extension: fileExt,
      });
    } catch (error) {
      console.error("Failed to download QR code", error);
    }
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
          {["svg", "jpeg", "webp", "png"].map((ext) => (
            <DropdownMenuItem
              key={ext}
              className="cursor-pointer"
              onClick={() => onDownloadClick(ext as TFileExtension)}
            >
              <span>{ext.toUpperCase()}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QrCodeDownloadBtn;
