"use client";

import React from "react";
import { api } from "~/lib/trpc/react";
import Container from "../ui/container";
import { DashboardListItem } from "./ListItem";
import { QRcode } from "~/server/domain/entities/QRcode";
import { Loader2 } from "lucide-react";

export const QrCodeList = () => {
  const { isLoading, data: qrCodes } = api.qrCode.getMyQrCodes.useQuery();

  if (isLoading || !qrCodes) {
    return (
      <div>
        <Loader2 className="mr-2 h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <Container className="justify-center space-y-4">
      {qrCodes.data.map((qr) => {
        return <DashboardListItem key={qr.id} qr={QRcode.fromDTO(qr)} />;
      })}
    </Container>
  );
};
