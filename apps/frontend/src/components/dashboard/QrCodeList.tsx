"use client";

import { DashboardListItem } from "./ListItem";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { useListQrCodesQuery } from "@/lib/api/qr-code";
import { useTranslations } from "next-intl";

export const QrCodeList = () => {
	const t = useTranslations();
	const { data: qrCodes, isLoading } = useListQrCodesQuery();

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
					return <DashboardListItem key={qr.id} qr={qr} />;
				})}
				{qrCodes.data.length === 0 && (
					<TableRow className="hover:bg-transparent">
						<TableCell colSpan={6} className="text-center">
							<h2 className="my-10 text-2xl font-bold">
								{t("qrCode.error.noFound")}
							</h2>
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
};
