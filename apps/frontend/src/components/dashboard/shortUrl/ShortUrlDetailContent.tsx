'use client';

import React, { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
	ExclamationTriangleIcon,
	LinkIcon,
	PencilIcon,
	TrashIcon,
} from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { CopyUrlButton } from '../qrCode/content-renderers/CopyUrlButton';
import { AnalyticsSection } from '@/components/qr-code-detail/analytics/AnalyticsSection';
import {
	useDeleteShortUrlMutation,
	useToggleActiveStateMutation,
	urlShortenerQueryKeys,
} from '@/lib/api/url-shortener';
import { createLinkFromShortUrl } from '@/lib/utils';
import { EditShortUrlDialog } from './EditShortUrlDialog';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { Link } from '@/i18n/navigation';
import { useQueryClient } from '@tanstack/react-query';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';

interface ShortUrlDetailContentProps {
	shortUrl: TShortUrlWithCustomDomainResponseDto;
}

export function ShortUrlDetailContent({ shortUrl }: ShortUrlDetailContentProps) {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isDeleting, setIsDeleting] = React.useState(false);
	const [editOpen, setEditOpen] = React.useState(false);

	const deleteMutation = useDeleteShortUrlMutation();
	const toggleMutation = useToggleActiveStateMutation();

	const fullLink = createLinkFromShortUrl(shortUrl);
	const displayLink = createLinkFromShortUrl(shortUrl, { short: true });

	// We disabled this link for safety; the API refuses to re-enable it, so neither may the UI.
	const isBlocked = shortUrl.safetyStatus === 'blocked';
	const threatTypes = shortUrl.safetyThreatTypes?.split(',').filter(Boolean) ?? [];

	const handleDelete = useCallback(() => {
		setIsDeleting(true);
		deleteMutation.mutate(shortUrl.shortCode, {
			onSuccess: () => {
				posthog.capture('short-url-deleted', {
					shortCode: shortUrl.shortCode,
				});
				router.push('/dashboard/short-urls');
			},
			onError: (e) => {
				const error = e as ApiError;
				setIsDeleting(false);
				if (error.code === 0 || error.code >= 500) {
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
					title: t('shortUrl.error.delete.title'),
					description: error.message,
				});
			},
		});
	}, [shortUrl.shortCode, deleteMutation, router, t]);

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
				router.refresh();
			},
			onError: (e) => {
				const error = e as ApiError;
				// defence in depth: the control is disabled when blocked, but data can be stale
				if (error.errorCode === 'SHORT_URL_BLOCKED') {
					toast({
						title: t('shortUrl.error.blocked.title'),
						description: t('shortUrl.error.blocked.message'),
						variant: 'destructive',
					});
					return;
				}
				Sentry.captureException(error);
				toast({
					title: t('shortUrl.error.toggleActiveState.title'),
					description: t('shortUrl.error.toggleActiveState.message'),
					variant: 'destructive',
				});
			},
		});
	};

	return (
		<>
			{/* Header Card */}
			<Card className="@container/card">
				<CardContent className="px-4 sm:px-6">
					<Breadcrumb className="mb-4">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/dashboard/short-urls">{t('shortUrl.title')}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{shortUrl.shortCode}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
						<div className="flex items-start sm:items-center gap-3 min-w-0">
							<div className="p-2.5 sm:p-3 bg-primary/10 rounded-lg shrink-0">
								<LinkIcon className="size-5 sm:size-8 stroke-1" />
							</div>
							<div className="min-w-0">
								<h1 className="text-base sm:text-lg font-semibold break-words leading-snug">
									{displayLink}
								</h1>
								{isBlocked ? (
									<Badge variant="destructive" className="mt-1.5">
										{t('shortUrl.status.blocked')}
									</Badge>
								) : (
									<Badge variant={shortUrl.isActive ? 'blue' : 'outline'} className="mt-1.5">
										{shortUrl.isActive
											? t('shortUrl.status.active')
											: t('shortUrl.status.inactive')}
									</Badge>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							{isBlocked ? (
								<Tooltip>
									{/* a disabled button swallows pointer events, so the trigger needs a wrapper */}
									<TooltipTrigger asChild>
										<span tabIndex={0} className="inline-flex">
											<Button size="sm" variant="outline" disabled>
												{t('shortUrl.status.enable')}
											</Button>
										</span>
									</TooltipTrigger>
									<TooltipContent side="bottom" className="max-w-xs">
										{t('shortUrl.safety.blocked.tooltip')}
									</TooltipContent>
								</Tooltip>
							) : (
								<Button
									size="sm"
									variant="outline"
									onClick={handleToggle}
									disabled={toggleMutation.isPending}
								>
									{shortUrl.isActive ? t('shortUrl.status.disable') : t('shortUrl.status.enable')}
								</Button>
							)}
							<Button size="sm" onClick={() => setEditOpen(true)}>
								<PencilIcon className="size-4 lg:hidden" />
								<span className="hidden lg:inline">{t('general.edit')}</span>
							</Button>
							<AlertDialog>
								<AlertDialogTrigger className="cursor-pointer" asChild>
									<Button
										disabled={isDeleting}
										isLoading={isDeleting}
										variant="destructive"
										size="sm"
									>
										<TrashIcon className="size-4 lg:hidden" />
										<span className="hidden lg:inline">{t('general.delete')}</span>
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>{t('shortUrl.delete.title')}</AlertDialogTitle>
										<AlertDialogDescription>{t('shortUrl.delete.confirm')}</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel asChild>
											<Button variant="secondary">{t('general.cancel')}</Button>
										</AlertDialogCancel>
										<Button
											variant="destructive"
											disabled={isDeleting}
											isLoading={isDeleting}
											onClick={handleDelete}
										>
											{t('general.delete')}
										</Button>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>
				</CardContent>
			</Card>

			{isBlocked && (
				<div
					role="alert"
					className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40"
				>
					<div className="flex gap-3">
						<ExclamationTriangleIcon
							aria-hidden="true"
							className="size-5 shrink-0 text-red-600 dark:text-red-400"
						/>
						<div className="space-y-1.5">
							<p className="text-sm font-semibold text-red-900 dark:text-red-100">
								{t('shortUrl.safety.blocked.title')}
							</p>
							<p className="text-sm text-red-800 dark:text-red-200">
								{t('shortUrl.safety.blocked.description')}
							</p>
							{threatTypes.length > 0 && (
								<p className="text-xs text-red-700 dark:text-red-300">
									{t('shortUrl.safety.blocked.threatTypes')}{' '}
									<span className="font-mono">{threatTypes.join(', ')}</span>
								</p>
							)}
							<p className="text-sm text-red-800 dark:text-red-200">
								{t('shortUrl.safety.blocked.remediation')}
							</p>
							<p className="text-xs text-red-700 dark:text-red-300">
								{t('shortUrl.safety.blocked.support')}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Content Card */}
			<Card>
				<CardContent className="px-4 sm:px-6">
					<div className="space-y-4">
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">
								{t('shortUrl.table.shortUrl')}
							</p>
							<div className="group/url flex items-center gap-2 [&_button]:opacity-100">
								<span className="text-sm font-medium text-primary">{displayLink}</span>
								<CopyUrlButton url={fullLink} />
							</div>
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">
								{t('shortUrl.table.destination')}
							</p>
							<div className="group/url flex items-center gap-2 [&_button]:opacity-100">
								<span className="text-sm break-all">{shortUrl.destinationUrl}</span>
								{shortUrl.destinationUrl && <CopyUrlButton url={shortUrl.destinationUrl} />}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Analytics */}
			<AnalyticsSection shortCode={shortUrl.shortCode} variant="click" />

			<EditShortUrlDialog
				shortUrl={shortUrl}
				open={editOpen}
				onOpenChange={setEditOpen}
				onSuccess={() => router.refresh()}
			/>
		</>
	);
}
