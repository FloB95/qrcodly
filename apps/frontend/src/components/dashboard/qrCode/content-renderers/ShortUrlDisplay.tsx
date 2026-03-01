'use client';

import { ArrowTurnDownRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useShortUrlLink } from '@/hooks/use-short-url-link';
import type { TShortUrlResponseDto } from '@shared/schemas';

interface ShortUrlDisplayProps {
	shortUrl: TShortUrlResponseDto;
	destinationUrl?: string | null;
	destinationContent?: React.ReactNode;
	className?: string;
}

export const ShortUrlDisplay = ({
	shortUrl: shortUrlData,
	destinationUrl,
	destinationContent,
	className = 'text-muted-foreground hover:underline',
}: ShortUrlDisplayProps) => {
	const { link: shortUrl, isLoading } = useShortUrlLink(shortUrlData);

	if (!shortUrl || isLoading) {
		return <div className={className}>Loading...</div>;
	}

	return (
		<div>
			<Link
				href={shortUrl}
				prefetch={false}
				target="_blank"
				onClick={(e) => e.stopPropagation()}
				onContextMenu={(e) => e.stopPropagation()}
				className={className}
			>
				{shortUrl}
			</Link>
			{destinationUrl && (
				<div className="mt-1 ml-2 flex items-center">
					<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 font-semibold text-muted-foreground" />
					{destinationContent || (
						<Link
							onClick={(e) => e.stopPropagation()}
							onContextMenu={(e) => e.stopPropagation()}
							href={destinationUrl}
							target="_blank"
							className="pt-1 text-sm text-black hover:underline"
							prefetch={false}
						>
							{destinationUrl}
						</Link>
					)}
				</div>
			)}
		</div>
	);
};
