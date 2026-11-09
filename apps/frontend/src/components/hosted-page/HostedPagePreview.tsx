'use client';

import { useEffect, useRef } from 'react';
import type { TPublicHostedPageResponseDto } from '@shared/schemas';
import { HostedPageView } from './registry';

/** A phone around the real page components, so the preview is the page. */
export function HostedPagePreview({ page }: { page: TPublicHostedPageResponseDto }) {
	const frame = useRef<HTMLDivElement>(null);
	// a new look is judged from the top: changing style, colours, font or mode rewinds the page
	const look = JSON.stringify(page.theme) + page.type;
	useEffect(() => {
		frame.current?.scrollTo({ top: 0 });
	}, [look]);

	return (
		<div className="relative mx-auto w-[300px] rounded-[2.4rem] bg-slate-900 p-[10px] shadow-[0_18px_40px_-22px_rgba(15,23,42,0.5)]">
			<span
				aria-hidden="true"
				className="absolute top-[18px] left-1/2 z-10 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-slate-900"
			/>
			{/* the frame scrolls; the page inside is inert: nothing in it can be clicked or focused */}
			<div
				ref={frame}
				className="h-[600px] overflow-y-auto overscroll-contain rounded-[1.9rem] bg-white [scrollbar-width:none]"
			>
				<div inert className="pointer-events-none flex min-h-full flex-col select-none">
					<HostedPageView page={page} preview />
				</div>
			</div>
		</div>
	);
}
