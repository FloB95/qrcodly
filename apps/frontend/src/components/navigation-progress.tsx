'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function NavigationProgress() {
	const pathname = usePathname();
	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const previousPathname = useRef(pathname);

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
			intervalRef.current = setInterval(() => {
				current += Math.random() * 15;
				if (current > 90) current = 90;
				setProgress(current);
			}, 200);
		}

		document.addEventListener('click', handleClick, true);
		return () => {
			document.removeEventListener('click', handleClick, true);
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (pathname !== previousPathname.current) {
			previousPathname.current = pathname;

			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}

			setProgress(100);
			const timeout = setTimeout(() => {
				setVisible(false);
				setProgress(0);
			}, 200);

			return () => clearTimeout(timeout);
		}
		return undefined;
	}, [pathname]);

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
