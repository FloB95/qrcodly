'use client';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useListTagsQuery } from '@/lib/api/tag';
import { useTranslations } from 'next-intl';
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import { useState, useMemo, useEffect } from 'react';
import { getPageNumbers } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { TagIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { TagListItem, SkeletonTagListItem } from './TagListItem';
import { TagCreateDialog } from './TagCreateDialog';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export const TagList = () => {
	const t = useTranslations('tags');
	const router = useRouter();
	const searchParams = useSearchParams();

	const pageParam = Number(searchParams.get('page')) || 1;
	const [currentPage, setCurrentPage] = useState(pageParam);
	const [currentLimit] = useState(10);
	const [searchValue, setSearchValue] = useState('');
	const [debouncedSearch] = useDebouncedValue(searchValue, 400);

	useEffect(() => {
		const url = new URL(window.location.href);
		if (currentPage === 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(currentPage));
		}
		router.replace(url.pathname + url.search, { scroll: false });
	}, [currentPage, router]);

	useEffect(() => {
		if (pageParam !== currentPage) {
			setCurrentPage(pageParam);
		}
	}, [pageParam]);

	// Reset to page 1 when search changes
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearch]);

	const {
		data: tags,
		isLoading,
		isFetching,
	} = useListTagsQuery(currentPage, currentLimit, debouncedSearch || undefined);

	const totalPages = useMemo(
		() => (tags ? Math.ceil(tags.total / currentLimit) : 1),
		[tags, currentLimit],
	);

	const handlePageChange = (page: number) => {
		if (page !== currentPage && page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const renderTableHeader = () => (
		<TableHeader className="bg-muted sticky top-0 z-10">
			<TableRow>
				<TableHead className="w-[60px]">{t('table.color')}</TableHead>
				<TableHead>{t('table.name')}</TableHead>
				<TableHead>{t('table.usage')}</TableHead>
				<TableHead className="hidden md:table-cell">{t('table.created')}</TableHead>
				<TableHead className="w-[100px]" />
			</TableRow>
		</TableHeader>
	);

	if (isLoading || !tags) {
		return (
			<div className="overflow-hidden rounded-lg border">
				<Table>
					{renderTableHeader()}
					<TableBody>
						{Array.from({ length: 5 }).map((_, idx) => (
							<SkeletonTagListItem key={idx} />
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	if (!isFetching && tags.data.length === 0 && !debouncedSearch) {
		return (
			<Empty className="sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="default">
						<TagIcon className="w-12 h-12" />
					</EmptyMedia>
					<EmptyTitle>{t('noTags')}</EmptyTitle>
					<EmptyDescription>{t('noTagsDescription')}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<TagCreateDialog />
				</EmptyContent>
			</Empty>
		);
	}

	const searchInput = (
		<div className="relative max-w-sm">
			<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder={t('searchTags')}
				value={searchValue}
				onChange={(e) => setSearchValue(e.target.value)}
				className="pl-9 pr-9 h-9 bg-white"
			/>
			{searchValue && (
				<button
					onClick={() => setSearchValue('')}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
				>
					<XMarkIcon className="h-4 w-4" />
				</button>
			)}
		</div>
	);

	if (!isFetching && tags.data.length === 0 && debouncedSearch) {
		return (
			<div className="space-y-4">
				{searchInput}
				<div className="text-sm text-muted-foreground py-8 text-center">
					{t('noSearchResults', { search: debouncedSearch })}
				</div>
			</div>
		);
	}

	const pageNumbers = getPageNumbers(currentPage, totalPages);
	return (
		<div className="space-y-4">
			{searchInput}
			<div className="overflow-hidden rounded-lg border">
				<Table>
					{renderTableHeader()}
					<TableBody>
						{isFetching
							? (tags.data.length > 0 ? tags.data : Array.from({ length: 5 })).map((_, idx) => (
									<SkeletonTagListItem key={idx} />
								))
							: tags.data.map((tag) => <TagListItem key={tag.id} tag={tag} />)}
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
