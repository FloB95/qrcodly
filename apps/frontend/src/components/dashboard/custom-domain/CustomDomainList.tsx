'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useListCustomDomainsQuery, useDefaultCustomDomainQuery } from '@/lib/api/custom-domain';
import { CustomDomainListItem } from './CustomDomainListItem';
import { SystemDomainListItem } from './SystemDomainListItem';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
} from '@/components/ui/empty';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import { Globe } from 'lucide-react';
import { env } from '@/env';

const ITEMS_PER_PAGE = 10;

// Extract domain from FRONTEND_URL (e.g., "qrcodly.de" from "https://www.qrcodly.de")
const getSystemDomain = (): string => {
	try {
		const url = new URL(env.NEXT_PUBLIC_FRONTEND_URL);
		return url.hostname.replace(/^www\./, '');
	} catch {
		return 'qrcodly.de';
	}
};

export function CustomDomainList() {
	const t = useTranslations('settings.domains');
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);
	const { data, isLoading, error } = useListCustomDomainsQuery(currentPage, ITEMS_PER_PAGE);
	const { data: defaultDomain } = useDefaultCustomDomainQuery();

	const systemDomain = getSystemDomain();
	// System domain is default if no custom domain is set as default
	const isSystemDomainDefault = !defaultDomain;

	const handlePageChange = (newPage: number) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('page', String(newPage));
		router.push(`${pathname}?${params.toString()}`);
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[...Array(3)].map((_, i) => (
					<Skeleton key={i} className="h-16 w-full" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<Globe className="h-12 w-12 text-muted-foreground" />
					</EmptyMedia>
					<EmptyTitle>{t('errorTitle')}</EmptyTitle>
					<EmptyDescription>{error.message}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	const domains = data?.data ?? [];
	const pagination = data?.pagination;

	return (
		<div className="space-y-4 overflow-hidden rounded-lg border">
			<Table>
				<TableHeader className="bg-muted sticky top-0 z-10">
					<TableRow>
						<TableHead>{t('domain')}</TableHead>
						<TableHead>{t('dnsStatus')}</TableHead>
						<TableHead>{t('status')}</TableHead>
						<TableHead>{t('createdAt')}</TableHead>
						<TableHead className="w-[100px]">{t('actions')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{/* System domain always shown first */}
					<SystemDomainListItem systemDomain={systemDomain} isDefault={isSystemDomainDefault} />
					{/* Custom domains */}
					{domains.map((domain) => (
						<CustomDomainListItem key={domain.id} domain={domain} />
					))}
				</TableBody>
			</Table>

			{pagination && pagination.totalPages > 1 && (
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href="#"
								onClick={(e) => {
									e.preventDefault();
									if (currentPage > 1) handlePageChange(currentPage - 1);
								}}
								aria-disabled={currentPage <= 1}
								className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
							/>
						</PaginationItem>
						<PaginationItem>
							<span className="px-4 py-2 text-sm">
								{t('pageInfo', {
									current: currentPage,
									total: pagination.totalPages,
								})}
							</span>
						</PaginationItem>
						<PaginationItem>
							<PaginationNext
								href="#"
								onClick={(e) => {
									e.preventDefault();
									if (currentPage < pagination.totalPages) handlePageChange(currentPage + 1);
								}}
								aria-disabled={currentPage >= pagination.totalPages}
								className={
									currentPage >= pagination.totalPages ? 'pointer-events-none opacity-50' : ''
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</div>
	);
}
