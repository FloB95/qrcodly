'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export function NavigationProgress() {
	const pathname = usePathname();
	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const previousPathname = useRef(pathname);

	const finishProgress = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}

		setProgress(100);
		setTimeout(() => {
			setVisible(false);
			setProgress(0);
		}, 200);
	}, []);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			const anchor = (e.target as HTMLElement).closest('a');
			if (!anchor) return;

			const href = anchor.getAttribute('href');
			if (!href || !href.startsWith('/') || anchor.target === '_blank' || e.metaKey || e.ctrlKey) {
				return;
			}

			// Parse the href to separate pathname and query params
			const url = new URL(href, window.location.origin);
			const targetPathname = url.pathname;

			// Skip if only query params are changing (same pathname)
			if (previousPathname.current === targetPathname) {
				return;
			}

			// Start progress bar
			setVisible(true);
			setProgress(0);

			let current = 0;
			if (intervalRef.current) clearInterval(intervalRef.current);
			if (timeoutRef.current) clearTimeout(timeoutRef.current);

			intervalRef.current = setInterval(() => {
				if (current < 90) {
					current += Math.random() * 15;
					if (current > 90) current = 90;
				} else {
					// Slowly crawl past 90% instead of stopping
					current += (100 - current) * 0.3;
					if (current > 99.5) current = 99.5;
				}
				setProgress(current);
			}, 200);

			// Safety: force-complete after 3 seconds if pathname never changed
			timeoutRef.current = setTimeout(() => {
				finishProgress();
			}, 3000);
		}

		document.addEventListener('click', handleClick, true);
		return () => {
			document.removeEventListener('click', handleClick, true);
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
	}, [finishProgress]);

	useEffect(() => {
		if (pathname !== previousPathname.current) {
			previousPathname.current = pathname;
			finishProgress();
		}
	}, [pathname, finishProgress]);

	if (!visible) return null;

	return (
		<div className="absolute inset-x-0 top-0 z-50 h-[3px]">
			<div
				className="h-full bg-primary transition-all duration-200 ease-out"
				style={{ width: `${progress}%` }}
			/>
		</div>
	);
}
