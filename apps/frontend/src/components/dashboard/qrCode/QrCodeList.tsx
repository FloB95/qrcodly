'use client';

import { QrCodeListItem, SkeletonListItem } from './ListItem';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../../ui/table';
import { useListQrCodesQuery } from '@/lib/api/qr-code';
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
import { useMemo } from 'react';
import { cn, getPageNumbers } from '@/lib/utils';
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
import { useUrlPaginationSync } from '@/hooks/use-url-pagination-sync';

type QrCodeListProps = {
	onBulkImport?: (contentType: TQrCodeContentType) => void;
	onBulkExport?: () => void;
};

const QrCodeTableHeader = ({
	isVisible,
}: {
	isVisible: (col: 'content' | 'status' | 'scans' | 'created' | 'tags') => boolean;
}) => {
	const t = useTranslations('qrCode.table');
	return (
		<TableHeader className="bg-muted sticky top-0 z-10">
			<TableRow>
				<TableHead className="w-[60px]">{t('preview')}</TableHead>
				<TableHead className="pl-[calc(1rem+18px+0.5rem)]">{t('name')}</TableHead>
				{isVisible('content') && (
					<TableHead className="hidden lg:table-cell">{t('content')}</TableHead>
				)}
				{isVisible('status') && <TableHead>{t('status')}</TableHead>}
				{isVisible('scans') && <TableHead>{t('scans')}</TableHead>}
				{isVisible('created') && (
					<TableHead className="hidden md:table-cell">{t('created')}</TableHead>
				)}
				<TableHead className="w-[60px]" />
			</TableRow>
		</TableHeader>
	);
};

export const QrCodeList = ({ onBulkImport, onBulkExport }: QrCodeListProps) => {
	const t = useTranslations();
	const { currentPage, filters, handleFiltersChange, handlePageChange } = useUrlPaginationSync();
	const currentLimit = 10;
	const { visibility, toggleColumn, isVisible } = useQrCodeColumnVisibility();

	const {
		data: qrCodes,
		isLoading,
		isFetching,
	} = useListQrCodesQuery(currentPage, currentLimit, filters);

	const totalPages = useMemo(
		() => (qrCodes ? Math.ceil(qrCodes.total / currentLimit) : 1),
		[qrCodes, currentLimit],
	);

	if (isLoading || !qrCodes) {
		return (
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<QrCodeTableHeader isVisible={isVisible} />
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
						totalQrCodes={qrCodes?.total ?? 0}
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
				totalQrCodes={qrCodes?.total ?? 0}
			/>
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<QrCodeTableHeader isVisible={isVisible} />
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
								onClick={
									currentPage === 1
										? undefined
										: () => handlePageChange(currentPage - 1, totalPages)
								}
								aria-disabled={currentPage === 1}
								tabIndex={currentPage === 1 ? -1 : 0}
								className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
							/>
						</PaginationItem>
						{pageNumbers.map((pageNumber) => (
							<PaginationItem key={pageNumber}>
								<PaginationLink
									isActive={currentPage === pageNumber}
									onClick={() => handlePageChange(pageNumber, totalPages)}
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
									currentPage === totalPages
										? undefined
										: () => handlePageChange(currentPage + 1, totalPages)
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
