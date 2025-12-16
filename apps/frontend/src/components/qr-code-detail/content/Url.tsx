import { ArrowTurnDownRightIcon } from '@heroicons/react/24/outline';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import Link from 'next/link';

export const UrlContent = ({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) => {
	const isShortUrl = qrCode?.shortUrl?.destinationUrl !== undefined;
	const destinationUrl =
		qrCode?.shortUrl?.destinationUrl ??
		(typeof qrCode.content.data === 'object' && 'url' in qrCode.content.data
			? qrCode.content.data.url
			: '');

	if (qrCode.content.type !== 'url') return;

	return (
		<>
			<h2 className="mb-4 text-2xl font-bold">
				<a href={destinationUrl} target="_blank" rel="noopener noreferrer" className="break-all">
					{destinationUrl}
				</a>
			</h2>
			{isShortUrl && (
				<div
					className={`ml-2 flex items-center opacity-100 transition-opacity duration-300 ease-in-out`}
				>
					<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 font-bold" />
					<Link
						href={qrCode.content.data.url}
						target="_blank"
						className="text-muted-foreground pt-1 text-md"
						prefetch={false}
					>
						{qrCode.content.data.url}
					</Link>
				</div>
			)}
		</>
	);
};
