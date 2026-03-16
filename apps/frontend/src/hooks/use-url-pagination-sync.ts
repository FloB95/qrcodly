'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { QrCodeFilters as QrCodeFiltersType } from '@/lib/api/qr-code';

/**
 * Bidirectional sync between URL search params and pagination/filter state.
 * - URL → state: browser back/forward and external links (e.g. ?tag=abc) update local state
 * - State → URL: page changes and filter resets update the URL without full navigation
 */
export function useUrlPaginationSync() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const pageParam = Number(searchParams.get('page')) || 1;
	const tagParam = searchParams.get('tag');
	const [currentPage, setCurrentPage] = useState(pageParam);
	const [filters, setFilters] = useState<QrCodeFiltersType>(() => ({
		tagIds: tagParam ? [tagParam] : undefined,
	}));

	const isInitialMount = useRef(true);
	// Prevents state→URL effect from pushing back when the change came from URL navigation
	const syncingFromUrl = useRef(false);

	// URL → state (must run before state→URL to set the flag)
	useEffect(() => {
		if (pageParam !== currentPage) {
			syncingFromUrl.current = true;
			setCurrentPage(pageParam);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageParam]);

	// State → URL
	useEffect(() => {
		if (syncingFromUrl.current) {
			syncingFromUrl.current = false;
			return;
		}

		const pageInUrl = Number(searchParams.get('page')) || 1;
		if (pageInUrl === currentPage) return;

		const params = new URLSearchParams(searchParams.toString());
		if (currentPage === 1) {
			params.delete('page');
		} else {
			params.set('page', String(currentPage));
		}
		const search = params.toString();
		router.replace(pathname + (search ? '?' + search : ''), { scroll: false });
	}, [currentPage, pathname, router, searchParams]);

	// URL → state: sync tag filter from ?tag= param (e.g. clicking a tag badge)
	useEffect(() => {
		setFilters(tagParam ? { tagIds: [tagParam] } : {});
		// Only reset page to 1 when tag changes after initial mount,
		// so ?page=3&tag=abc deep links preserve the page number
		if (isInitialMount.current) {
			isInitialMount.current = false;
		} else {
			setCurrentPage(1);
		}
	}, [tagParam]);

	const handleFiltersChange = (newFilters: QrCodeFiltersType) => {
		setFilters(newFilters);
		setCurrentPage(1);
	};

	const handlePageChange = (page: number, totalPages: number) => {
		if (page !== currentPage && page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	return {
		currentPage,
		filters,
		handleFiltersChange,
		handlePageChange,
	};
}
