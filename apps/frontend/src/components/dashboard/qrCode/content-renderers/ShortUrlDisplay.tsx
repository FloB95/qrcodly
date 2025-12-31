'use client';

import { ArrowTurnDownRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getShortUrlFromCode } from '@/lib/utils';

interface ShortUrlDisplayProps {
	shortCode: string;
	destinationUrl?: string | null;
	destinationContent?: React.ReactNode;
	className?: string;
}

export const ShortUrlDisplay = ({
	shortCode,
	destinationUrl,
	destinationContent,
	className = 'text-muted-foreground',
}: ShortUrlDisplayProps) => {
	const shortUrl = getShortUrlFromCode(shortCode);

	return (
		<div>
			<Link
				href={shortUrl}
				prefetch={false}
				target="_blank"
				onClick={(e) => e.stopPropagation()}
				className={className}
			>
				{shortUrl}
			</Link>
			{destinationUrl && (
				<div className="mt-1 ml-2 flex items-center">
					<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 font-bold text-muted-foreground" />
					{destinationContent || (
						<Link
							onClick={(e) => e.stopPropagation()}
							href={destinationUrl}
							target="_blank"
							className="pt-1 text-sm text-black"
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
