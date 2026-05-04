'use client';

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
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useListConfigTemplatesQuery } from '@/lib/api/config-template';
import { TemplateListItem, SkeletonTemplateListItem } from './ListItem';
import { TableLoader } from '@/components/ui/table-loader';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { StarIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';

type TemplateListProps = {
	onCreateTemplate?: () => void;
};

export const TemplateList = ({ onCreateTemplate }: TemplateListProps) => {
	const t = useTranslations();
	const searchParams = useSearchParams();

	const pageParam = Number(searchParams.get('page')) || 1;
	const [currentPage, setCurrentPage] = useState(pageParam);
	const [currentLimit] = useState(10);
	const [searchValue, setSearchValue] = useState('');
	const [debouncedSearch] = useDebouncedValue(searchValue, 400);

	// If the URL changes (e.g., via back/forward), update currentPage
	useEffect(() => {
		if (pageParam !== currentPage) {
			setCurrentPage(pageParam);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageParam]);

	// Reset to page 1 when search changes
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearch]);

	const {
		data: templates,
		isLoading,
		isFetching,
	} = useListConfigTemplatesQuery(debouncedSearch || undefined, currentPage, currentLimit);

	const isRefetching = isFetching && !isLoading;

	const totalPages = useMemo(
		() => (templates ? Math.ceil(templates.total / currentLimit) : 1),
		[templates, currentLimit],
	);

	const handlePageChange = (page: number) => {
		if (page !== currentPage && page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const tableHeader = (
		<TableHeader className="bg-muted sticky top-0 z-10">
			<TableRow>
				<TableHead className="w-[72px]">{t('qrCode.table.preview')}</TableHead>
				<TableHead>{t('qrCode.table.name')}</TableHead>
				<TableHead className="hidden md:table-cell">{t('qrCode.table.created')}</TableHead>
				<TableHead className="w-[60px] sticky right-0 bg-muted z-20 px-2" />
			</TableRow>
		</TableHeader>
	);

	if (isLoading || !templates) {
		return (
			<div className="overflow-hidden rounded-lg border">
				<Table>
					{tableHeader}
					<TableBody>
						{Array.from({ length: 5 }).map((_, idx) => (
							<SkeletonTemplateListItem key={idx} />
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	if (!isFetching && templates.data.length === 0 && !debouncedSearch) {
		return (
			<Empty className="sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="default">
						<StarIcon className="w-12 h-12" />
					</EmptyMedia>
					<EmptyTitle>{t('templates.noTemplates')}</EmptyTitle>
					<EmptyDescription>{t('templates.pageDescription')}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					{onCreateTemplate && (
						<Button onClick={onCreateTemplate} className="md:flex md:space-x-2">
							<PlusIcon className="h-5 w-5" />
							<span>{t('collection.addTemplateBtn')}</span>
						</Button>
					)}
				</EmptyContent>
			</Empty>
		);
	}

	const searchInput = (
		<div className="relative max-w-sm">
			<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder={t('templates.search.placeholder')}
				value={searchValue}
				onChange={(e) => setSearchValue(e.target.value)}
				className="pl-9 pr-9 h-9"
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

	if (!isFetching && templates.data.length === 0 && debouncedSearch) {
		return (
			<div className="space-y-4">
				{searchInput}
				<div className="text-sm text-muted-foreground py-8 text-center">
					{t('templates.search.noResults', { searchName: debouncedSearch })}
				</div>
			</div>
		);
	}

	const pageNumbers = getPageNumbers(currentPage, totalPages);

	return (
		<div className="space-y-4">
			{searchInput}
			<div className={cn('relative')}>
				{isRefetching && <TableLoader />}
				<div className="overflow-hidden rounded-lg border">
					<Table>
						{tableHeader}
						<TableBody
							className={cn(
								isRefetching &&
									'pointer-events-none opacity-50 blur-[0.6px] transition-all duration-200',
							)}
						>
							{templates.data.map((template) => (
								<TemplateListItem key={template.id} template={template} />
							))}
						</TableBody>
					</Table>
				</div>
			</div>
			{totalPages > 1 && (
				<Pagination className={cn(isRefetching && 'pointer-events-none opacity-50')}>
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
};
