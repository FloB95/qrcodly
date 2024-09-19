"use client";

import { type QRcode } from "~/server/domain/entities/QRcode";
import QrCodeDownloadBtn from "../qr-generator/QrCodeDownloadBtn";
import { useCallback, useState } from "react";
import { api } from "~/lib/trpc/react";
import { toast } from "../ui/use-toast";
import { Button } from "../ui/button";
import { DynamicQrCode } from "../qr-generator/DynamicQrCode";
import { QrCodeSkeleton } from "../qr-generator/QrCodeSkeleton";
import {
  DocumentTextIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { LinkIcon, WifiIcon } from "lucide-react";

const GetNameByContentType = (qr: QRcode) => {
  switch (qr.config.contentType.type) {
    case "url":
      return qr.config.data;
    case "text":
      return qr.config.data;
    case "wifi":
      return qr.getOriginalData<"wifi">().ssid;
    case "vCard":
      return `${qr.getOriginalData<"vCard">()?.firstName ?? ""} ${qr.getOriginalData<"vCard">()?.lastName ?? ""}`;
    default:
      return "Unknown";
  }
};

const GetQrCodeIconByContentType = (qr: QRcode) => {
  switch (qr.config.contentType.type) {
    case "url":
      return <LinkIcon className="mr-2 h-6 w-6" />;
    case "text":
      return <DocumentTextIcon className="mr-2 h-6 w-6" />;
    case "wifi":
      return <WifiIcon className="mr-2 h-6 w-6" />;
    case "vCard":
      return <IdentificationIcon className="mr-2 h-6 w-6" />;
    default:
      return "❓";
  }
};

export const DashboardListItem = ({ qr }: { qr: QRcode }) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const deleteMutation = api.qrCode.delete.useMutation();
  const apiUtils = api.useUtils();
  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    deleteMutation.mutate(
      { id: qr.id },
      {
        onSuccess: () => {
          apiUtils.qrCode.getMyQrCodes
            .invalidate()
            .then(() => {
              toast({
                title: "QR code deleted",
                description: "We deleted your QR code.",
                duration: 5000,
              });
              setIsDeleting(false);
            })
            .catch((error) => {
              console.error("Failed to invalidate QR codes:", error);
              setIsDeleting(false);
            });
        },
      },
    );
  }, [qr, deleteMutation, apiUtils]);

  return (
    <div className="flex justify-center space-x-8">
      <div className="flex flex-col justify-center text-center">
        {GetQrCodeIconByContentType(qr)}
      </div>
      <div className="max-h-[100px] max-w-[100px] overflow-hidden lg:max-h-[100px] lg:max-w-[100px]">
        <DynamicQrCode
          settings={qr.config}
          additionalStyles="max-h-[100px] max-w-[100px] lg:max-h-[100px] lg:max-w-[100px]"
        />
        <QrCodeSkeleton />
      </div>
      <div>
        <p>{GetNameByContentType(qr)}</p>
      </div>
      <div>
        <QrCodeDownloadBtn qrCodeSettings={qr.config} />
      </div>
      <div>
        <Button isLoading={isDeleting} onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
};
