/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { Button } from "../ui/button";
// import { toast } from "../ui/use-toast";
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
	convertQrCodeOptionsToLibraryOptions,
	getDefaultContentByType,
	type TCreateQrCodeDto,
	type TFileExtension,
} from "@shared/schemas";
import { useCreateQrCodeMutation } from "@/lib/api/qr-code";
import { toast } from "../ui/use-toast";
import { useTranslations } from "next-intl";

let QRCodeStyling: any;
const QrCodeDownloadBtn = ({
	qrCode,
	saveOnDownload = false,
	noStyling = false,
}: {
	qrCode: TCreateQrCodeDto;
	saveOnDownload?: boolean;
	noStyling?: boolean;
}) => {
	const t = useTranslations("qrCode.download");
	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
	const createQrCodeMutation = useCreateQrCodeMutation();

	useEffect(() => {
		// Dynamically import the QRCodeStyling class only when the component mounts
		import("qr-code-styling").then((module) => {
			QRCodeStyling = module.default;
			const qrCodeInstance = new QRCodeStyling({
				...convertQrCodeOptionsToLibraryOptions(qrCode.config),
				data: convertQRCodeDataToStringByType(qrCode.content),
			}); // Create a new instance with the current settings
			setQrCodeInstance(qrCodeInstance); // Store the instance in the state
		});
	}, [qrCode]);

	const onDownloadClick = async (fileExt: TFileExtension) => {
		if (!qrCodeInstance) return;

		if (saveOnDownload) {
			try {
				await createQrCodeMutation.mutateAsync(qrCode, {
					onSuccess: (data) => {
						// if user is logged in, show toast
						if (data.success && data.isStored) {
							// show toast
							toast({
								title: t("successTitle"),
								description: t("successDescription"),
								duration: 10000,
							});
						}
					},
				});

				posthog.capture("QRCodeCreated", {
					data: qrCode.content,
				});
			} catch {}
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
				disabled={
					JSON.stringify(qrCode.content) ===
						JSON.stringify(getDefaultContentByType(qrCode.content.type)) ||
					createQrCodeMutation.isPending
				}
			>
				{noStyling ? (
					<div className="cursor-pointer">Download</div>
				) : (
					<Button
						isLoading={createQrCodeMutation.isPending}
						disabled={
							JSON.stringify(qrCode.content) ===
								JSON.stringify(getDefaultContentByType(qrCode.content.type)) ||
							createQrCodeMutation.isPending
						}
					>
						{t("downloadBtn")}
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
