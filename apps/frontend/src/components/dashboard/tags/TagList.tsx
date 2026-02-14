'use client';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { TagIcon } from '@heroicons/react/24/outline';
import { TagListItem, SkeletonTagListItem } from './TagListItem';
import { TagCreateDialog } from './TagCreateDialog';

export const TagList = () => {
	const t = useTranslations('tags');
	const router = useRouter();
	const searchParams = useSearchParams();

	const pageParam = Number(searchParams.get('page')) || 1;
	const [currentPage, setCurrentPage] = useState(pageParam);
	const [currentLimit] = useState(10);

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

	const { data: tags, isLoading, isFetching } = useListTagsQuery(currentPage, currentLimit);

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

	if (isFetching) {
		return (
			<div className="overflow-hidden rounded-lg border">
				<Table>
					{renderTableHeader()}
					<TableBody>
						{(tags.data.length > 0 ? tags.data : Array.from({ length: 5 })).map((_, idx) => (
							<SkeletonTagListItem key={idx} />
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	if (tags.data.length === 0) {
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

	const pageNumbers = getPageNumbers(currentPage, totalPages);
	return (
		<div className="space-y-4">
			<div className="overflow-hidden rounded-lg border">
				<Table>
					{renderTableHeader()}
					<TableBody>
						{tags.data.map((tag) => (
							<TagListItem key={tag.id} tag={tag} />
						))}
					</TableBody>
				</Table>
			</div>
			{totalPages > 1 && (
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
