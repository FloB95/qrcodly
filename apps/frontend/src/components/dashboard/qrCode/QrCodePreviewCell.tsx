import Image from 'next/image';
import { TableCell } from '@/components/ui/table';
import { DynamicQrCode } from '@/components/qr-generator/DynamicQrCode';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export const QrCodePreviewCell = ({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	return (
		<TableCell className="w-[72px] py-2 pr-2">
			<HoverCard openDelay={200} closeDelay={100}>
				<HoverCardTrigger asChild>
					<div className="flex items-center gap-2">
						<div className="size-14 shrink-0 overflow-hidden rounded">
							{qr.previewImage ? (
								<Image
									src={qr.previewImage}
									width={56}
									height={56}
									alt="QR code preview"
									className="size-14 object-cover"
									loading="lazy"
								/>
							) : (
								<DynamicQrCode qrCode={qr} additionalStyles="max-h-14 max-w-14" />
							)}
						</div>
					</div>
				</HoverCardTrigger>
				<HoverCardContent side="right" className="w-auto p-2">
					<div className="h-[200px] w-[200px] overflow-hidden rounded">
						{qr.previewImage ? (
							<Image
								src={qr.previewImage}
								width={200}
								height={200}
								alt="QR code preview"
								className="h-[200px] w-[200px] object-cover"
							/>
						) : (
							<DynamicQrCode qrCode={qr} additionalStyles="max-h-[200px] max-w-[200px]" />
						)}
					</div>
				</HoverCardContent>
			</HoverCard>
		</TableCell>
	);
};
