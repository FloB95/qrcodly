'use client';

import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsTruncated } from '@/hooks/use-is-truncated';

interface TruncatedLinkProps {
	href: string;
	className?: string;
}

export const TruncatedLink = ({ href, className }: TruncatedLinkProps) => {
	const [ref, isTruncated, checkTruncation] = useIsTruncated<HTMLAnchorElement>();

	return (
		<Tooltip open={isTruncated ? undefined : false}>
			<TooltipTrigger asChild>
				<Link
					ref={ref}
					onMouseEnter={checkTruncation}
					href={href}
					prefetch={false}
					target="_blank"
					onClick={(e) => e.stopPropagation()}
					onContextMenu={(e) => e.stopPropagation()}
					className={className}
				>
					{href}
				</Link>
			</TooltipTrigger>
			<TooltipContent side="top" className="max-w-[400px] break-all">
				{href}
			</TooltipContent>
		</Tooltip>
	);
};
