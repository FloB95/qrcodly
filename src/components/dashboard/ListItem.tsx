/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { type QRcode } from "~/server/domain/entities/QRcode";
import QrCode from "../qr-generator/QrCode";
import QrCodeDownloadBtn from "../qr-generator/QrCodeDownloadBtn";
import QRCodeStyling from "qr-code-styling";
import { useCallback, useState } from "react";
import { api } from "~/lib/trpc/react";
import { toast } from "../ui/use-toast";
import { Button } from "../ui/button";

export const DashboardListItem = ({ qr }: { qr: QRcode }) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const deleteMutation = api.qrCode.delete.useMutation();
  const apiUtils = api.useUtils();
  const handleDelete = useCallback(() => {
    deleteMutation.mutate(
      { id: qr.id },
      {
        onSuccess: async () => {
          setIsDeleting(true);
          await apiUtils.qrCode.getMyQrCodes.invalidate();
          toast({
            title: "QR code deleted",
            description: "We deleted your QR code.",
            duration: 5000,
          });
          setIsDeleting(false);
        },
      },
    );
  }, [qr]);

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
      <div>
        <Button isLoading={isDeleting} onClick={handleDelete}>Delete</Button>
      </div>
    </div>
  );
};


