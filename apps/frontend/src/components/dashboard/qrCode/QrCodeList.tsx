'use client';

import { QrCodeListItem, SkeletonListItem } from './ListItem';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../../ui/table';
import { useListQrCodesQuery, type QrCodeFilters as QrCodeFiltersType } from '@/lib/api/qr-code';
import { QrCodeFilters } from './QrCodeFilters';
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
import { useState, useMemo, useEffect } from 'react';
import { cn, getPageNumbers } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQrCodeColumnVisibility } from './hooks/useQrCodeColumnVisibility';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { PlusIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import type { TQrCodeContentType } from '@shared/schemas';

type QrCodeListProps = {
	onBulkImport?: (contentType: TQrCodeContentType) => void;
	onBulkExport?: () => void;
};

export const QrCodeList = ({ onBulkImport, onBulkExport }: QrCodeListProps) => {
	const t = useTranslations();
	const router = useRouter();
	const searchParams = useSearchParams();

	const pageParam = Number(searchParams.get('page')) || 1;
	const tagParam = searchParams.get('tag');
	const [currentPage, setCurrentPage] = useState(pageParam);
	const [currentLimit] = useState(10);
	const [filters, setFilters] = useState<QrCodeFiltersType>(() => ({
		tagIds: tagParam ? [tagParam] : undefined,
	}));
	const { visibility, toggleColumn, isVisible } = useQrCodeColumnVisibility();

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

	// If the URL changes (e.g., via back/forward), update currentPage and tag filter
	useEffect(() => {
		if (pageParam !== currentPage) {
			setCurrentPage(pageParam);
		}
	}, [pageParam]);

	useEffect(() => {
		setFilters(tagParam ? { tagIds: [tagParam] } : {});
		setCurrentPage(1);
	}, [tagParam]);

	const handleFiltersChange = (newFilters: QrCodeFiltersType) => {
		setFilters(newFilters);
		setCurrentPage(1);
	};

	const {
		data: qrCodes,
		isLoading,
		isFetching,
	} = useListQrCodesQuery(currentPage, currentLimit, filters);

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
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader className="bg-muted sticky top-0 z-10">
						<TableRow>
							<TableHead className="w-[60px]">{t('qrCode.table.preview')}</TableHead>
							<TableHead className="pl-[calc(1rem+18px+0.5rem)]">
								{t('qrCode.table.name')}
							</TableHead>
							{isVisible('content') && (
								<TableHead className="hidden lg:table-cell">{t('qrCode.table.content')}</TableHead>
							)}
							{isVisible('status') && <TableHead>{t('qrCode.table.status')}</TableHead>}
							{isVisible('scans') && <TableHead>{t('qrCode.table.scans')}</TableHead>}
							{isVisible('created') && (
								<TableHead className="hidden md:table-cell">{t('qrCode.table.created')}</TableHead>
							)}
							<TableHead className="w-[60px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 5 }).map((_, idx) => (
							<SkeletonListItem key={idx} visibility={visibility} />
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	const hasActiveFilters =
		!!filters.search || !!filters.contentType?.length || !!filters.tagIds?.length;

	if (!isFetching && qrCodes.data.length === 0) {
		return (
			<div className="space-y-4">
				{hasActiveFilters && (
					<QrCodeFilters
						filters={filters}
						onFiltersChange={handleFiltersChange}
						columnVisibility={visibility}
						onToggleColumn={toggleColumn}
						onBulkImport={onBulkImport}
						onBulkExport={onBulkExport}
					/>
				)}
				<Empty className="sm:my-12">
					<EmptyHeader>
						<EmptyMedia variant="default">
							<QrCodeIcon className="w-12 h-12" />
						</EmptyMedia>
						<EmptyTitle>{t('qrCode.error.noFound')}</EmptyTitle>
						<EmptyDescription>{t('qrCode.error.noFoundDescription')}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Link href="/" className={cn(buttonVariants(), 'md:flex md:space-x-2')}>
							<PlusIcon className="h-5 w-5" />
							<span className="sr-only md:not-sr-only md:whitespace-nowrap">
								{t('collection.addQrCodeBtn')}
							</span>
						</Link>
					</EmptyContent>
				</Empty>
			</div>
		);
	}

	const pageNumbers = getPageNumbers(currentPage, totalPages);
	return (
		<div className="space-y-4">
			<QrCodeFilters
				filters={filters}
				onFiltersChange={handleFiltersChange}
				columnVisibility={visibility}
				onToggleColumn={toggleColumn}
				onBulkImport={onBulkImport}
				onBulkExport={onBulkExport}
			/>
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader className="bg-muted sticky top-0 z-10">
						<TableRow>
							<TableHead className="w-[60px]">{t('qrCode.table.preview')}</TableHead>
							<TableHead className="pl-[calc(1rem+18px+0.5rem)]">
								{t('qrCode.table.name')}
							</TableHead>
							{isVisible('content') && (
								<TableHead className="hidden lg:table-cell">{t('qrCode.table.content')}</TableHead>
							)}
							{isVisible('status') && <TableHead>{t('qrCode.table.status')}</TableHead>}
							{isVisible('scans') && <TableHead>{t('qrCode.table.scans')}</TableHead>}
							{isVisible('created') && (
								<TableHead className="hidden md:table-cell">{t('qrCode.table.created')}</TableHead>
							)}
							<TableHead className="w-[60px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isFetching
							? (qrCodes.data.length > 0 ? qrCodes.data : Array.from({ length: 5 })).map(
									(_, idx) => <SkeletonListItem key={idx} visibility={visibility} />,
								)
							: qrCodes.data.map((qr) => (
									<QrCodeListItem key={qr.id} qr={qr} visibility={visibility} />
								))}
					</TableBody>
				</Table>
			</div>
			{!isFetching && totalPages > 1 && (
				<Pagination>
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
		</div>
	);
};
