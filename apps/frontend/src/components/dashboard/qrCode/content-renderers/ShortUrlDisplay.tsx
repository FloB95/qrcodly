'use client';

import { ArrowTurnDownRightIcon } from '@heroicons/react/24/outline';
import { useShortUrlLink } from '@/hooks/use-short-url-link';
import { cn } from '@/lib/utils';
import type { TShortUrlResponseDto, TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { CopyUrlButton } from './CopyUrlButton';
import { TruncatedLink } from './TruncatedLink';

interface ShortUrlDisplayProps {
	shortUrl: TShortUrlResponseDto | TShortUrlWithCustomDomainResponseDto;
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
		<div className="min-w-0">
			<div className="group/url flex min-w-0 items-center gap-1">
				<TruncatedLink href={shortUrl} className={cn('truncate', className)} />
				<CopyUrlButton url={shortUrl} />
			</div>
			{destinationUrl && (
				<div className="mt-1 ml-2 flex min-w-0 items-center">
					<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 shrink-0 font-semibold text-muted-foreground" />
					{destinationContent || (
						<div className="group/url flex min-w-0 items-center gap-1">
							<TruncatedLink
								href={destinationUrl}
								className="truncate pt-1 text-sm text-foreground hover:underline"
							/>
							<CopyUrlButton url={destinationUrl} />
						</div>
					)}
				</div>
			)}
		</div>
	);
};
