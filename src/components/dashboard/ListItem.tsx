"use client";

import { type QRcode } from "~/server/domain/entities/QRcode";
import QrCodeDownloadBtn from "../qr-generator/QrCodeDownloadBtn";
import { useCallback, useState } from "react";
import { api } from "~/lib/trpc/react";
import { toast } from "../ui/use-toast";
import { Button } from "../ui/button";
import { DynamicQrCode } from "../qr-generator/DynamicQrCode";
import {
  DocumentTextIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  IdentificationIcon,
  LinkIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import { TableCell, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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
    <TableRow className="border-none bg-white shadow hover:bg-muted/90">
      <TableCell className="hidden sm:table-cell py-8">
        <div className="flex space-x-8">
          <div className="ml-4 flex flex-col justify-center">
            {GetQrCodeIconByContentType(qr)}
          </div>
          <div className="h-[100px] w-[100px] overflow-hidden">
            <DynamicQrCode
              settings={qr.config}
              additionalStyles="max-h-[100px] max-w-[100px] lg:max-h-[100px] lg:max-w-[100px]"
            />
          </div>
        </div>
      </TableCell>
      <TableCell className="font-medium">{GetNameByContentType(qr)}</TableCell>
      <TableCell>
        <Badge variant="outline">Active</Badge>
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <span>10</span> <EyeIcon width={20} height={20} />
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        2023-11-29 08:15 AM
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <EllipsisVerticalIcon width={28} height={28}/>
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <QrCodeDownloadBtn qrCodeSettings={qr.config} />
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Button isLoading={isDeleting} onClick={handleDelete}>
                Delete
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
