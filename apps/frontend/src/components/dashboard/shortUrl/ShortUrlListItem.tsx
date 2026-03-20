'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { EyeIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShortUrlDisplay } from '../qrCode/content-renderers/ShortUrlDisplay';
import {
	useDeleteShortUrlMutation,
	useGetViewsFromShortCodeQuery,
	useToggleActiveStateMutation,
	useUpdateShortUrlNameMutation,
} from '@/lib/api/url-shortener';
import { formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { EditShortUrlDialog } from './EditShortUrlDialog';
import { DeleteShortUrlDialog } from './DeleteShortUrlDialog';
import { ShortUrlNameCell } from './ShortUrlNameCell';
import { NameDialog } from '@/components/qr-generator/NameDialog';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';

interface ShortUrlListItemProps {
	shortUrl: TShortUrlWithCustomDomainResponseDto;
}

const stopContextMenu = (e: React.MouseEvent) => e.stopPropagation();

export function ShortUrlListItem({ shortUrl }: ShortUrlListItemProps) {
	const t = useTranslations('shortUrl');
	const tGeneral = useTranslations('general');
	const router = useRouter();
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);

	const deleteMutation = useDeleteShortUrlMutation();
	const toggleMutation = useToggleActiveStateMutation();
	const updateNameMutation = useUpdateShortUrlNameMutation();
	const { data: viewsData, isLoading: viewsLoading } = useGetViewsFromShortCodeQuery(
		shortUrl.shortCode,
	);

	const handleDelete = () => {
		deleteMutation.mutate(shortUrl.shortCode, {
			onSuccess: () => {
				posthog.capture('short-url-deleted', {
					shortCode: shortUrl.shortCode,
				});
				toast({ title: t('delete.success') });
				setDeleteOpen(false);
			},
			onError: (e) => {
				const error = e as ApiError;
				if (error.code >= 500) {
					Sentry.captureException(error, {
						extra: {
							shortCode: shortUrl.shortCode,
							error: { code: error.code, message: error.message },
						},
					});
				}
				posthog.capture('error:short-url-deleted', {
					shortCode: shortUrl.shortCode,
					error: { code: error.code, message: error.message },
				});
				toast({
					variant: 'destructive',
					title: t('error.delete.title'),
					description: error.message,
				});
			},
		});
	};

	const handleToggle = () => {
		toggleMutation.mutate(shortUrl.shortCode, {
			onSuccess: () => {
				posthog.capture('short-url-toggled', {
					shortCode: shortUrl.shortCode,
					isActive: !shortUrl.isActive,
				});
			},
			onError: (error) => {
				Sentry.captureException(error);
				toast({
					title: t('error.toggleActiveState.title'),
					description: t('error.toggleActiveState.message'),
					variant: 'destructive',
				});
			},
		});
	};

	const handleUpdateName = (name: string) => {
		updateNameMutation.mutate(
			{ shortCode: shortUrl.shortCode, name: name || null },
			{
				onError: (error) => {
					Sentry.captureException(error);
					toast({
						title: t('error.update.title'),
						variant: 'destructive',
					});
				},
			},
		);
	};

	const menuItems = (Component: typeof DropdownMenuItem | typeof ContextMenuItem) => (
		<>
			<Component
				onClick={() => router.push(`/dashboard/short-urls/${shortUrl.shortCode}`)}
				className="cursor-pointer"
			>
				{t('viewDetails')}
			</Component>
			<Component onClick={() => setEditOpen(true)} className="cursor-pointer">
				{tGeneral('edit')}
			</Component>
			<Component onClick={handleToggle} className="cursor-pointer">
				{shortUrl.isActive ? t('status.disable') : t('status.enable')}
			</Component>
			<Component onClick={() => setDeleteOpen(true)} className="cursor-pointer text-destructive">
				{tGeneral('delete')}
			</Component>
		</>
	);

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<TableRow className={shortUrl.isActive === false ? 'opacity-60' : ''}>
					{/* Name */}
					<ShortUrlNameCell shortUrl={shortUrl} onEditName={() => setNameDialogOpen(true)} />

					{/* Content (Short URL + Destination) */}
					<TableCell className="hidden md:table-cell py-2 max-w-[300px]">
						<div className="truncate text-sm text-foreground">
							<ShortUrlDisplay shortUrl={shortUrl} destinationUrl={shortUrl.destinationUrl} />
						</div>
					</TableCell>

					{/* Status */}
					<TableCell className="py-2">
						<Badge variant={shortUrl.isActive ? 'blue' : 'outline'} className="text-xs">
							{shortUrl.isActive ? t('status.active') : t('status.inactive')}
						</Badge>
					</TableCell>

					{/* Views */}
					<TableCell className="hidden sm:table-cell py-2">
						{viewsLoading ? (
							<div className="flex items-center gap-1 text-sm">
								<EyeIcon className="size-3.5 text-muted-foreground" />
								<Loader2 className="size-3.5 animate-spin text-muted-foreground" />
							</div>
						) : (
							viewsData?.views !== undefined && (
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-1 text-sm">
											<EyeIcon className="size-3.5 text-muted-foreground" />
											<span>{viewsData.views}</span>
										</div>
									</TooltipTrigger>
									<TooltipContent side="top">
										{viewsData.views} {t('table.views')}
									</TooltipContent>
								</Tooltip>
							)
						)}
					</TableCell>

					{/* Created */}
					<TableCell className="hidden lg:table-cell py-2 text-sm text-muted-foreground">
						{formatDate(shortUrl.createdAt)}
					</TableCell>

					{/* Actions */}
					<TableCell
						className="w-[60px] py-2 px-2 sticky right-0 sticky-action-cell"
						onContextMenu={stopContextMenu}
					>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<EllipsisVerticalIcon className="size-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">{menuItems(DropdownMenuItem)}</DropdownMenuContent>
						</DropdownMenu>
					</TableCell>
				</TableRow>
			</ContextMenuTrigger>

			<ContextMenuContent>{menuItems(ContextMenuItem)}</ContextMenuContent>

			<EditShortUrlDialog shortUrl={shortUrl} open={editOpen} onOpenChange={setEditOpen} />
			<DeleteShortUrlDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onConfirm={handleDelete}
				isDeleting={deleteMutation.isPending}
			/>
			<NameDialog
				dialogHeadline={t('edit.title')}
				placeholder={t('create.namePlaceholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleUpdateName}
				defaultValue={shortUrl.name ?? ''}
			/>
		</ContextMenu>
	);
}
