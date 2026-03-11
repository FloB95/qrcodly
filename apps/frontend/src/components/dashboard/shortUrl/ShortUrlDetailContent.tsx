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
import { LinkIcon } from '@heroicons/react/24/outline';
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
					title: t('shortUrl.delete.title'),
					variant: 'destructive',
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
			onError: (error) => {
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

					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<LinkIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<h1 className="text-lg font-semibold">{displayLink}</h1>
								<Badge variant={shortUrl.isActive ? 'default' : 'outline'} className="mt-1">
									{shortUrl.isActive ? t('shortUrl.status.active') : t('shortUrl.status.inactive')}
								</Badge>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={handleToggle}
								disabled={toggleMutation.isPending}
							>
								{shortUrl.isActive ? t('shortUrl.status.disable') : t('shortUrl.status.enable')}
							</Button>
							<Button size="sm" onClick={() => setEditOpen(true)}>
								{t('general.edit')}
							</Button>
							<AlertDialog>
								<AlertDialogTrigger className="cursor-pointer" asChild>
									<Button
										disabled={isDeleting}
										isLoading={isDeleting}
										variant="destructive"
										size="sm"
									>
										{t('general.delete')}
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
			<AnalyticsSection shortCode={shortUrl.shortCode} />

			<EditShortUrlDialog shortUrl={shortUrl} open={editOpen} onOpenChange={setEditOpen} />
		</>
	);
}
