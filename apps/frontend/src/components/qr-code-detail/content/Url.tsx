import { ArrowTurnLeftUpIcon } from '@heroicons/react/24/outline';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import Link from 'next/link';
import { useShortUrlLink } from '@/hooks/use-short-url-link';

export const UrlContent = ({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) => {
	const isShortUrl = qrCode?.shortUrl?.destinationUrl !== undefined;
	const destinationUrl =
		qrCode?.shortUrl?.destinationUrl ??
		(typeof qrCode.content.data === 'object' && 'url' in qrCode.content.data
			? qrCode.content.data.url
			: '');
	const { link: shortUrlLink } = useShortUrlLink(qrCode?.shortUrl);

	if (qrCode.content.type !== 'url') return;

	return (
		<>
			<h2 className="mb-4 text-2xl font-semibold">
				<a href={destinationUrl} target="_blank" rel="noopener noreferrer" className="break-all">
					{destinationUrl}
				</a>
			</h2>
			{isShortUrl && qrCode?.shortUrl && shortUrlLink && (
				<div
					className={`ml-2 flex items-center opacity-100 transition-opacity duration-300 ease-in-out`}
				>
					<ArrowTurnLeftUpIcon className="mr-3 h-6 w-6 font-semibold" />
					<Link
						href={shortUrlLink}
						target="_blank"
						className="text-muted-foreground pt-1 text-md break-all"
						prefetch={false}
					>
						{shortUrlLink}
					</Link>
				</div>
			)}
		</>
	);
};
