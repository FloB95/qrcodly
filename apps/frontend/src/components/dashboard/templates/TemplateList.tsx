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
import { getPageNumbers } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useListConfigTemplatesQuery } from '@/lib/api/config-template';
import { TemplateListItem, SkeletonTemplateListItem } from './ListItem';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { StarIcon } from '@heroicons/react/24/outline';

export const TemplateList = () => {
	const t = useTranslations();
	const searchParams = useSearchParams();

	const pageParam = Number(searchParams.get('page')) || 1;
	const [currentPage, setCurrentPage] = useState(pageParam);
	const [currentLimit] = useState(10);

	// If the URL changes (e.g., via back/forward), update currentPage
	useEffect(() => {
		if (pageParam !== currentPage) {
			setCurrentPage(pageParam);
		}
	}, [pageParam]);

	const {
		data: templates,
		isLoading,
		isFetching,
	} = useListConfigTemplatesQuery(undefined, currentPage, currentLimit);

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
				<TableHead className="w-[60px]" />
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

	if (isFetching) {
		return (
			<div className="overflow-hidden rounded-lg border">
				<Table>
					{tableHeader}
					<TableBody>
						{(templates.data.length > 0 ? templates.data : Array.from({ length: 5 })).map(
							(_, idx) => (
								<SkeletonTemplateListItem key={idx} />
							),
						)}
					</TableBody>
				</Table>
			</div>
		);
	}

	if (templates.data.length === 0) {
		return (
			<Empty className="sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="default">
						<StarIcon className="w-12 h-12" />
					</EmptyMedia>
					<EmptyTitle>{t('templates.noTemplates')}</EmptyTitle>
					<EmptyDescription>{t('templates.pageDescription')}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent />
			</Empty>
		);
	}

	const pageNumbers = getPageNumbers(currentPage, totalPages);

	return (
		<div className="space-y-4">
			<div className="overflow-hidden rounded-lg border">
				<Table>
					{tableHeader}
					<TableBody>
						{templates.data.map((template) => (
							<TemplateListItem key={template.id} template={template} />
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
