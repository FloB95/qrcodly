import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { type Button, buttonVariants } from '@/components/ui/button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
	return (
		<nav
			role="navigation"
			aria-label="pagination"
			data-slot="pagination"
			className={cn('mx-auto flex w-full justify-center', className)}
			{...props}
		/>
	);
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn('flex flex-row items-center gap-1', className)}
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
	React.ComponentProps<'a'>;

function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
	return (
		<a
			aria-current={isActive ? 'page' : undefined}
			data-slot="pagination-link"
			data-active={isActive}
			className={cn(
				buttonVariants({
					variant: isActive ? 'default' : 'white',
					size,
				}),
				size === 'icon' ? 'h-8 w-8 text-sm' : 'h-8 text-sm',
				className,
			)}
			{...props}
		/>
	);
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
	const t = useTranslations();
	return (
		<PaginationLink
			aria-label={t('pagination.previousAria', { defaultValue: 'Go to previous page' })}
			size="sm"
			className={cn('gap-1 h-8 px-2 sm:pl-2', className)}
			{...props}
		>
			<ChevronLeftIcon className="size-4" />
			<span className="hidden sm:block text-sm">
				{t('pagination.previous', { defaultValue: 'Previous' })}
			</span>
		</PaginationLink>
	);
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
	const t = useTranslations();
	return (
		<PaginationLink
			aria-label={t('pagination.nextAria', { defaultValue: 'Go to next page' })}
			size="sm"
			className={cn('gap-1 h-8 px-2 sm:pr-2', className)}
			{...props}
		>
			<span className="hidden sm:block text-sm">
				{t('pagination.next', { defaultValue: 'Next' })}
			</span>
			<ChevronRightIcon className="size-4" />
		</PaginationLink>
	);
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
	const t = useTranslations();
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn('flex size-8 items-center justify-center', className)}
			{...props}
		>
			<MoreHorizontalIcon className="size-4" />
			<span className="sr-only">{t('pagination.more', { defaultValue: 'More pages' })}</span>
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationLink,
	PaginationItem,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
};
