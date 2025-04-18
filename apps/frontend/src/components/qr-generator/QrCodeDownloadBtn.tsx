/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
'use client';

import { Button } from '../ui/button';
// import { toast } from "../ui/use-toast";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { convertQrCodeOptionsToLibraryOptions } from '@/lib/utils';
import {
	convertQRCodeDataToStringByType,
	type TCreateQrCodeDto,
	type TFileExtension,
} from '@shared/schemas';
import { useCreateQrCodeMutation } from '@/lib/api/qr-code';
import { toast } from '../ui/use-toast';

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
	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);

	const createQrCodeMutation = useCreateQrCodeMutation();

	useEffect(() => {
		// Dynamically import the QRCodeStyling class only when the component mounts
		import('qr-code-styling').then((module) => {
			QRCodeStyling = module.default;
			const qrCodeInstance = new QRCodeStyling({
				...convertQrCodeOptionsToLibraryOptions(qrCode.config),
				data: convertQRCodeDataToStringByType(qrCode.content, qrCode.contentType),
			}); // Create a new instance with the current settings
			setQrCodeInstance(qrCodeInstance); // Store the instance in the state
		});
	}, [qrCode]);

	const onDownloadClick = async (fileExt: TFileExtension) => {
		if (!qrCodeInstance) return;

		console.log('Downloading QR code...', qrCode);

		if (saveOnDownload) {
			try {
				await createQrCodeMutation.mutateAsync(qrCode, {
					onSuccess: (data) => {
						// if user is logged in, show toast
						if (data.success && data.isStored) {
							// show toast
							toast({
								title: 'New QR code created',
								description: 'We saved your QR Code in your dashboard for later use.',
								duration: 10000,
							});
						}
					},
				});

				posthog.capture('QRCodeCreated', {
					contentType: qrCode.contentType,
					data: qrCode.content,
				});
			} catch {}
		}

		await qrCodeInstance.download({
			name: 'qr-code',
			extension: fileExt,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				asChild
				disabled={
					(typeof qrCode.content === 'string' && qrCode.content.length <= 0) ||
					createQrCodeMutation.isPending
				}
			>
				{noStyling ? (
					<div className="cursor-pointer">Download</div>
				) : (
					<Button
						isLoading={createQrCodeMutation.isPending}
						disabled={
							(typeof qrCode.content === 'string' && qrCode.content.length <= 0) ||
							createQrCodeMutation.isPending
						}
					>
						Download
					</Button>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuItem className="cursor-pointer" onClick={() => onDownloadClick('svg')}>
						<span>SVG</span>
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer" onClick={() => onDownloadClick('jpeg')}>
						<span>JPG</span>
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer" onClick={() => onDownloadClick('webp')}>
						<span>WEBP</span>
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer" onClick={() => onDownloadClick('png')}>
						<span>PNG</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default QrCodeDownloadBtn;
