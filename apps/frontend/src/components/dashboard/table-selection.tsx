'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { bulkDelete, type TBulkDeletePath } from '@/lib/api/bulk-delete';
import type { TRowSelection } from '@/hooks/use-row-selection';

/** Header checkbox: selects or clears every row of the current page. */
export function SelectPageCheckbox({
	ids,
	selection,
}: {
	ids: string[];
	selection: TRowSelection;
}) {
	const t = useTranslations('bulkActions');
	const selectedOnPage = ids.filter((id) => selection.selected.has(id)).length;
	const checked =
		selectedOnPage === 0 ? false : selectedOnPage === ids.length ? true : 'indeterminate';

	return (
		<Checkbox
			className="cursor-pointer"
			checked={checked}
			disabled={ids.length === 0}
			aria-label={t('selectPage')}
			onCheckedChange={() => selection.setRows(ids, checked !== true)}
		/>
	);
}

export function SelectRowCheckbox({ id, selection }: { id: string; selection: TRowSelection }) {
	const t = useTranslations('bulkActions');
	return (
		<Checkbox
			className="cursor-pointer"
			checked={selection.selected.has(id)}
			aria-label={t('selectRow')}
			onCheckedChange={() => selection.toggle(id)}
			// the row behind it opens a context menu or a detail page
			onClick={(event) => event.stopPropagation()}
		/>
	);
}

// buttons inside the dark selection bar
export const bulkBarButtonClass =
	'h-8 gap-1.5 rounded-full text-background hover:bg-background/15 hover:text-background';

/**
 * Floats at the bottom of the screen while rows are selected, so the toolbar above the table
 * keeps all its controls and the actions stay in reach on long pages.
 */
export function BulkActionBar({
	count,
	onClear,
	children,
}: {
	count: number;
	onClear: () => void;
	children: ReactNode;
}) {
	const t = useTranslations('bulkActions');
	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
			<div
				role="toolbar"
				aria-label={t('selected', { count })}
				className="pointer-events-auto flex items-center gap-1 rounded-full bg-foreground py-1.5 pl-4 pr-1.5 text-background shadow-lg animate-in fade-in slide-in-from-bottom-2"
			>
				<span className="whitespace-nowrap pr-2 text-sm font-medium">
					{t('selected', { count })}
				</span>
				<span className="h-5 w-px bg-background/25" />
				{children}
				<span className="h-5 w-px bg-background/25" />
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className={cn(bulkBarButtonClass, 'size-8')}
							aria-label={t('clear')}
							onClick={onClear}
						>
							<XMarkIcon className="size-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top">{t('clear')}</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}

/** Deletes the selection after one confirmation, then reloads the affected lists. */
export function BulkDeleteButton({
	path,
	ids,
	warning,
	refetch,
	onDone,
}: {
	path: TBulkDeletePath;
	ids: string[];
	warning: string;
	refetch: QueryKey[];
	onDone: () => void;
}) {
	const t = useTranslations('bulkActions');
	const { getToken } = useAuth();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const { deleted, failed } = await bulkDelete(path, ids, await getToken());
			if (deleted > 0) toast({ title: t('deleted', { count: deleted }) });
			if (failed.length > 0) {
				toast({ variant: 'destructive', title: t('notDeleted', { count: failed.length }) });
			}
			onDone();
		} catch (error) {
			Sentry.captureException(error, { tags: { area: 'bulk-delete', path } });
			toast({ variant: 'destructive', title: t('error') });
		} finally {
			setIsDeleting(false);
			setOpen(false);
			for (const queryKey of refetch) void queryClient.refetchQueries({ queryKey });
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<Button
				variant="ghost"
				size="sm"
				// light red stays readable on the dark bar and on hover
				className={cn(bulkBarButtonClass, 'text-red-400 hover:text-red-400')}
				onClick={() => setOpen(true)}
			>
				<TrashIcon className="size-4" />
				<span className="hidden sm:inline">{t('delete')}</span>
			</Button>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('confirmTitle', { count: ids.length })}</AlertDialogTitle>
					<AlertDialogDescription>{warning}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
					<Button variant="destructive" isLoading={isDeleting} onClick={handleDelete}>
						{t('confirm')}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export const PAGE_SIZES = [10, 25, 50, 100];

/** Rows per page, remembered in this browser. */
export function usePageSize(storageKey: string): [number, (size: number) => void] {
	const [size, setSize] = useState(PAGE_SIZES[0]!);

	// read after mount: the server render has no localStorage
	useEffect(() => {
		try {
			const stored = Number(localStorage.getItem(storageKey));
			if (PAGE_SIZES.includes(stored)) setSize(stored);
		} catch {
			// storage blocked: keep the default
		}
	}, [storageKey]);

	const update = useCallback(
		(next: number) => {
			setSize(next);
			try {
				localStorage.setItem(storageKey, String(next));
			} catch {
				// storage blocked: the choice lasts for this visit only
			}
		},
		[storageKey],
	);

	return [size, update];
}

export function PageSizeSelect({
	value,
	onChange,
}: {
	value: number;
	onChange: (size: number) => void;
}) {
	const t = useTranslations('bulkActions');
	return (
		<div className="flex items-center gap-2 text-sm text-muted-foreground">
			<span className="whitespace-nowrap">{t('rowsPerPage')}</span>
			<Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
				<SelectTrigger className="h-8 w-[72px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{PAGE_SIZES.map((size) => (
						<SelectItem key={size} value={String(size)}>
							{size}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
