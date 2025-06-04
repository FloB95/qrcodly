'use client';

import { QrCodeListItem, SkeletonListItem } from './ListItem';
import { Table, TableBody, TableCell, TableRow } from '../../ui/table';
import { useListQrCodesQuery } from '@/lib/api/qr-code';
import { useTranslations } from 'next-intl';
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '../../ui/pagination';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { getPageNumbers } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

export const QrCodeList = () => {
	const t = useTranslations();
	const router = useRouter();
	const searchParams = useSearchParams();

	const pageParam = Number(searchParams.get('page')) || 1;
	const [currentPage, setCurrentPage] = useState(pageParam);
	const [currentLimit] = useState(10);

	// Keep currentPage in sync with URL
	useEffect(() => {
		const url = new URL(window.location.href);
		if (currentPage === 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(currentPage));
		}
		router.replace(url.pathname + url.search, { scroll: false });
	}, [currentPage, router]);

	// If the URL changes (e.g., via back/forward), update currentPage
	useEffect(() => {
		if (pageParam !== currentPage) {
			setCurrentPage(pageParam);
		}
	}, [pageParam]);

	const { data: qrCodes, isLoading, isFetching } = useListQrCodesQuery(currentPage, currentLimit);

	const totalPages = useMemo(
		() => (qrCodes ? Math.ceil(qrCodes.total / currentLimit) : 1),
		[qrCodes, currentLimit],
	);

	const handlePageChange = (page: number) => {
		if (page !== currentPage && page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	if (isLoading || !qrCodes) {
		return (
			<Table className="border-separate border-spacing-y-2">
				<TableBody>
					{Array.from({ length: 5 }).map((_, idx) => (
						<SkeletonListItem key={idx} />
					))}
				</TableBody>
			</Table>
		);
	}

	if (isFetching) {
		return (
			<Table className="border-separate border-spacing-y-2">
				<TableBody>
					{qrCodes.data.length > 0
						? qrCodes.data.map((qr) => <SkeletonListItem key={qr.id} />)
						: Array.from({ length: 5 }).map((_, idx) => <SkeletonListItem key={idx} />)}
				</TableBody>
			</Table>
		);
	}

	const pageNumbers = getPageNumbers(currentPage, totalPages);

	return (
		<Fragment>
			<Table className="border-separate border-spacing-y-2">
				<TableBody>
					{qrCodes.data.length > 0 ? (
						qrCodes.data.map((qr) => <QrCodeListItem key={qr.id} qr={qr} />)
					) : (
						<TableRow className="hover:bg-transparent" key="no-data">
							<TableCell colSpan={6} className="text-center">
								<h2 className="my-10 text-2xl font-bold">{t('qrCode.error.noFound')}</h2>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
			{totalPages > 1 && (
				<Pagination className="mt-6">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								onClick={currentPage === 1 ? undefined : () => handlePageChange(currentPage - 1)}
								aria-disabled={currentPage === 1}
								tabIndex={currentPage === 1 ? -1 : 0}
								className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
							/>
						</PaginationItem>
						{pageNumbers.map((pageNumber) => (
							<PaginationItem key={pageNumber}>
								<PaginationLink
									isActive={currentPage === pageNumber}
									onClick={() => handlePageChange(pageNumber)}
								>
									{pageNumber}
								</PaginationLink>
							</PaginationItem>
						))}
						{totalPages > 5 && currentPage < totalPages - 2 && (
							<PaginationItem>
								<PaginationEllipsis />
							</PaginationItem>
						)}
						<PaginationItem>
							<PaginationNext
								href="#"
								onClick={
									currentPage === totalPages ? undefined : () => handlePageChange(currentPage + 1)
								}
								aria-disabled={currentPage === totalPages}
								tabIndex={currentPage === totalPages ? -1 : 0}
								className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</Fragment>
	);
};
