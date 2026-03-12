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
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { EyeIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CopyUrlButton } from '../qrCode/content-renderers/CopyUrlButton';
import { TruncatedLink } from '../qrCode/content-renderers/TruncatedLink';
import {
	useDeleteShortUrlMutation,
	useGetViewsFromShortCodeQuery,
	useToggleActiveStateMutation,
} from '@/lib/api/url-shortener';
import { urlShortenerQueryKeys } from '@/lib/api/url-shortener';
import { createLinkFromShortUrl, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { EditShortUrlDialog } from './EditShortUrlDialog';
import { DeleteShortUrlDialog } from './DeleteShortUrlDialog';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';

interface ShortUrlListItemProps {
	shortUrl: TShortUrlWithCustomDomainResponseDto;
}

export function ShortUrlListItem({ shortUrl }: ShortUrlListItemProps) {
	const t = useTranslations('shortUrl');
	const tGeneral = useTranslations('general');
	const router = useRouter();
	const queryClient = useQueryClient();
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const deleteMutation = useDeleteShortUrlMutation();
	const toggleMutation = useToggleActiveStateMutation();
	const { data: viewsData, isLoading: viewsLoading } = useGetViewsFromShortCodeQuery(
		shortUrl.shortCode,
	);

	const link = createLinkFromShortUrl(shortUrl, { short: true });
	const fullLink = createLinkFromShortUrl(shortUrl);

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
				void queryClient.refetchQueries({
					queryKey: urlShortenerQueryKeys.listShortUrls,
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

	return (
		<>
			<TableRow
				className={`cursor-pointer ${shortUrl.isActive === false ? 'opacity-60' : ''}`}
				onClick={() => router.push(`/dashboard/short-urls/${shortUrl.shortCode}`)}
			>
				{/* Short URL */}
				<TableCell className="py-2">
					<div className="group/url flex items-center gap-1.5">
						<span className="text-sm font-medium text-primary truncate max-w-[200px]">{link}</span>
						<CopyUrlButton url={fullLink} />
					</div>
				</TableCell>

				{/* Destination */}
				<TableCell className="hidden md:table-cell py-2 max-w-[300px]">
					{shortUrl.destinationUrl && (
						<div className="group/url flex items-center gap-1">
							<TruncatedLink
								href={shortUrl.destinationUrl}
								className="truncate text-foreground hover:underline"
							/>
							<CopyUrlButton url={shortUrl.destinationUrl} />
						</div>
					)}
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
				<TableCell className="w-[60px] py-2" onClick={(e) => e.stopPropagation()}>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<EllipsisVerticalIcon className="size-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => router.push(`/dashboard/short-urls/${shortUrl.shortCode}`)}
								className="cursor-pointer"
							>
								{t('viewDetails')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setEditOpen(true)} className="cursor-pointer">
								{tGeneral('edit')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleToggle} className="cursor-pointer">
								{shortUrl.isActive ? t('status.disable') : t('status.enable')}
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => setDeleteOpen(true)}
								className="cursor-pointer text-destructive"
							>
								{tGeneral('delete')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</TableCell>
			</TableRow>

			<EditShortUrlDialog shortUrl={shortUrl} open={editOpen} onOpenChange={setEditOpen} />
			<DeleteShortUrlDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onConfirm={handleDelete}
				isDeleting={deleteMutation.isPending}
			/>
		</>
	);
}
