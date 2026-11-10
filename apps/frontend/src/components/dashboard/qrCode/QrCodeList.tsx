'use client';

import { QrCodeListItem, SkeletonListItem } from './ListItem';
import { TableLoader } from '@/components/ui/table-loader';
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
import { useEffect, useMemo } from 'react';
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
import { useRowSelection, type TRowSelection } from '@/hooks/use-row-selection';
import { qrCodeQueryKeys } from '@/lib/api/qr-code';
import { hostedPageQueryKeys } from '@/lib/api/hosted-page';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
	BulkActionBar,
	BulkDeleteButton,
	bulkBarButtonClass,
	PAGE_SIZES,
	PageSizeSelect,
	SelectPageCheckbox,
	usePageSize,
} from '../table-selection';

type QrCodeListProps = {
	onBulkImport?: (contentType: TQrCodeContentType) => void;
	/** Opens the export dialog, with these QR codes already ticked when given. */
	onBulkExport?: (ids?: string[]) => void;
};

const QrCodeTableHeader = ({
	isVisible,
	pageIds = [],
	selection,
}: {
	isVisible: (col: 'content' | 'status' | 'scans' | 'created' | 'tags') => boolean;
	pageIds?: string[];
	selection?: TRowSelection;
}) => {
	const t = useTranslations('qrCode.table');
	return (
		<TableHeader className="bg-muted sticky top-0 z-10">
			<TableRow>
				<TableHead className="w-[40px] pr-0">
					{selection && <SelectPageCheckbox ids={pageIds} selection={selection} />}
				</TableHead>
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
				<TableHead className="w-[60px] sticky right-0 bg-muted z-20 px-2" />
			</TableRow>
		</TableHeader>
	);
};

export const QrCodeList = ({ onBulkImport, onBulkExport }: QrCodeListProps) => {
	const t = useTranslations();
	const { currentPage, filters, handleFiltersChange, handlePageChange } = useUrlPaginationSync();
	const [currentLimit, setPageSize] = usePageSize('qrcodly.qrCodes.pageSize');
	const selection = useRowSelection();
	const { clear: clearSelection } = selection;

	// a selection only makes sense for the list it was made in
	useEffect(() => clearSelection(), [filters, clearSelection]);
	const { visibility, toggleColumn, isVisible } = useQrCodeColumnVisibility();

	const {
		data: qrCodes,
		isLoading,
		isFetching,
	} = useListQrCodesQuery(currentPage, currentLimit, filters);

	const isRefetching = isFetching && !isLoading;

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

	// `status` included so an empty "blocked" result still renders the filter bar — otherwise the
	// user is stuck in a filtered empty list with no control to clear it.
	const hasActiveFilters =
		!!filters.search ||
		!!filters.contentType?.length ||
		!!filters.tagIds?.length ||
		(!!filters.status && filters.status !== 'all');

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
	const pageIds = qrCodes.data.map((qr) => qr.id);
	const selectedIds = [...selection.selected];

	return (
		// room below the table so the floating selection bar never covers the pagination
		<div className={cn('space-y-4', selectedIds.length > 0 && 'pb-20')}>
			{selectedIds.length > 0 && (
				<BulkActionBar count={selectedIds.length} onClear={selection.clear}>
					{onBulkExport && (
						<Button
							variant="ghost"
							size="sm"
							className={bulkBarButtonClass}
							onClick={() => onBulkExport(selectedIds)}
						>
							<ArrowDownTrayIcon className="size-4" />
							<span className="hidden sm:inline">{t('bulkActions.download')}</span>
						</Button>
					)}
					<BulkDeleteButton
						path="qr-code"
						ids={selectedIds}
						warning={t('bulkActions.warningQrCodes')}
						refetch={[qrCodeQueryKeys.listQrCodes, hostedPageQueryKeys.usage]}
						onDone={selection.clear}
					/>
				</BulkActionBar>
			)}
			<QrCodeFilters
				filters={filters}
				onFiltersChange={handleFiltersChange}
				columnVisibility={visibility}
				onToggleColumn={toggleColumn}
				onBulkImport={onBulkImport}
				onBulkExport={onBulkExport}
				totalQrCodes={qrCodes?.total ?? 0}
			/>
			<div className={cn('relative')}>
				{isRefetching && <TableLoader />}
				<div className="overflow-hidden rounded-lg border">
					<Table>
						<QrCodeTableHeader isVisible={isVisible} pageIds={pageIds} selection={selection} />
						<TableBody
							className={cn(
								isRefetching &&
									'pointer-events-none opacity-50 blur-[0.6px] transition-all duration-200',
							)}
						>
							{qrCodes.data.map((qr) => (
								<QrCodeListItem key={qr.id} qr={qr} visibility={visibility} selection={selection} />
							))}
						</TableBody>
					</Table>
				</div>
			</div>
			{qrCodes.total > PAGE_SIZES[0]! && (
				<div className="flex justify-end">
					<PageSizeSelect
						value={currentLimit}
						onChange={(size) => {
							setPageSize(size);
							handlePageChange(1, totalPages);
						}}
					/>
				</div>
			)}
			{totalPages > 1 && (
				<Pagination className={cn(isRefetching && 'pointer-events-none opacity-50')}>
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
