'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell } from '@/components/ui/table';
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { LinkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { buttonVariants } from '@/components/ui/button';
import { cn, getPageNumbers } from '@/lib/utils';
import {
	useListShortUrlsQuery,
	type ShortUrlFilters as ShortUrlFiltersType,
} from '@/lib/api/url-shortener';
import { ShortUrlFilters } from './ShortUrlFilters';
import { ShortUrlListItem } from './ShortUrlListItem';
import { CreateShortUrlDialog } from './CreateShortUrlDialog';

const ShortUrlTableHeader = () => {
	const t = useTranslations('shortUrl.table');
	return (
		<TableHeader className="bg-muted sticky top-0 z-10">
			<TableRow>
				<TableHead>{t('shortUrl')}</TableHead>
				<TableHead className="hidden md:table-cell">{t('destination')}</TableHead>
				<TableHead>{t('status')}</TableHead>
				<TableHead className="hidden sm:table-cell">{t('views')}</TableHead>
				<TableHead className="hidden lg:table-cell">{t('created')}</TableHead>
				<TableHead className="w-[60px]" />
			</TableRow>
		</TableHeader>
	);
};

const SkeletonRow = () => (
	<TableRow>
		<TableCell className="py-2">
			<Skeleton className="h-4 w-32" />
		</TableCell>
		<TableCell className="hidden md:table-cell py-2">
			<Skeleton className="h-4 w-48" />
		</TableCell>
		<TableCell className="py-2">
			<Skeleton className="h-5 w-14 rounded-full" />
		</TableCell>
		<TableCell className="hidden sm:table-cell py-2">
			<Skeleton className="h-4 w-8" />
		</TableCell>
		<TableCell className="hidden lg:table-cell py-2">
			<Skeleton className="h-4 w-20" />
		</TableCell>
		<TableCell className="py-2">
			<Skeleton className="h-8 w-8 rounded" />
		</TableCell>
	</TableRow>
);

export function ShortUrlList() {
	const t = useTranslations('shortUrl');
	const [currentPage, setCurrentPage] = useState(1);
	const [filters, setFilters] = useState<ShortUrlFiltersType>({});
	const currentLimit = 10;

	const {
		data: shortUrls,
		isLoading,
		isError,
		isFetching,
	} = useListShortUrlsQuery(currentPage, currentLimit, filters);

	const totalPages = useMemo(
		() => (shortUrls ? Math.ceil(shortUrls.total / currentLimit) : 1),
		[shortUrls, currentLimit],
	);

	const handleFiltersChange = (newFilters: ShortUrlFiltersType) => {
		setFilters(newFilters);
		setCurrentPage(1);
	};

	const handlePageChange = (page: number) => {
		if (page !== currentPage && page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	if (isLoading) {
		return (
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<ShortUrlTableHeader />
					<TableBody>
						{Array.from({ length: 5 }).map((_, idx) => (
							<SkeletonRow key={idx} />
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	if (isError || !shortUrls) {
		return (
			<div className="py-12 text-center text-muted-foreground">
				<p>{t('error.load.title')}</p>
			</div>
		);
	}

	const hasActiveFilters = Object.values(filters as Record<string, unknown>).some((value) => {
		if (value == null) {
			return false;
		}

		if (typeof value === 'string') {
			return value.trim() !== '';
		}

		if (Array.isArray(value)) {
			return value.length > 0;
		}

		return true;
	});

	if (!isFetching && shortUrls.data.length === 0) {
		return (
			<div className="space-y-4">
				{hasActiveFilters && (
					<ShortUrlFilters filters={filters} onFiltersChange={handleFiltersChange} />
				)}
				<Empty className="sm:my-12">
					<EmptyHeader>
						<EmptyMedia variant="default">
							<LinkIcon className="w-12 h-12" />
						</EmptyMedia>
						<EmptyTitle>{t('empty.title')}</EmptyTitle>
						<EmptyDescription>{t('empty.description')}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<CreateShortUrlDialog
							trigger={
								<button type="button" className={cn(buttonVariants(), 'md:flex md:space-x-2')}>
									<PlusIcon className="h-5 w-5" />
									<span>{t('createBtn')}</span>
								</button>
							}
						/>
					</EmptyContent>
				</Empty>
			</div>
		);
	}

	const pageNumbers = getPageNumbers(currentPage, totalPages);

	return (
		<div className="space-y-4">
			<ShortUrlFilters filters={filters} onFiltersChange={handleFiltersChange} />
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<ShortUrlTableHeader />
					<TableBody>
						{isFetching
							? (shortUrls.data.length > 0 ? shortUrls.data : Array.from({ length: 5 })).map(
									(_, idx) => <SkeletonRow key={idx} />,
								)
							: shortUrls.data.map((su) => <ShortUrlListItem key={su.id} shortUrl={su} />)}
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
}
