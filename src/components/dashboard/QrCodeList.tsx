"use client";

import { api } from "~/lib/trpc/react";
import { DashboardListItem } from "./ListItem";
import { QRcode } from "~/server/domain/entities/QRcode";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";

export const QrCodeList = () => {
  const { isLoading, data: qrCodes } = api.qrCode.getMyQrCodes.useQuery();

  if (isLoading || !qrCodes) {
    return (
      <div className="flex justify-center p-24">
        <Loader2 className="mr-2 h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <Table className="border-separate border-spacing-y-2">
      <TableBody>
        {qrCodes.data.map((qr) => {
          return <DashboardListItem key={qr.id} qr={QRcode.fromDTO(qr)} />;
        })}
        {qrCodes.data.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={6} className="text-center">
              <h2 className="my-10 text-2xl font-bold">No QR codes found</h2>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
