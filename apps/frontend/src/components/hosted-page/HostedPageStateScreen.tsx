import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import NoNavHeader from '@/components/NoNavHeader';

/** Frame for the states a scan can land on instead of the page: switched off, blocked, busy. */
export function HostedPageStateScreen({
	centered,
	children,
}: {
	centered?: boolean;
	children: ReactNode;
}) {
	return (
		<main className="flex min-h-screen flex-col bg-linear-to-br from-zinc-100 to-[#fddfbc] px-4 sm:px-0">
			<NoNavHeader />
			<section
				className={cn('flex flex-1', centered && 'items-center justify-center py-16 sm:py-24')}
			>
				{children}
			</section>
		</main>
	);
}
