'use client';

import { useState } from 'react';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLocale, useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { ApiError } from '@/lib/api/ApiError';
import {
	useAccountDeletionRequestQuery,
	useRequestAccountDeletionMutation,
	useRevokeAccountDeletionMutation,
} from '@/lib/api/account';

const WARNINGS = [
	'deletionWarning1',
	'deletionWarning2',
	'deletionWarning3',
	'deletionWarning4',
] as const;

export function AccountDeletionSection() {
	const t = useTranslations('settings.profile');
	const locale = useLocale();
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	const { data, isPending, isError } = useAccountDeletionRequestQuery();
	const requestMutation = useRequestAccountDeletionMutation();
	const revokeMutation = useRevokeAccountDeletionMutation();

	const handleError = (e: unknown, event: string) => {
		const error = e as ApiError;
		if (error.code === 0 || error.code >= 500) {
			Sentry.captureException(error);
		}
		posthog.capture(event, { error: { code: error.code, message: error.message } });
		toast({ title: t('deletionError'), variant: 'destructive' });
	};

	const handleRequest = async () => {
		try {
			await requestMutation.mutateAsync();
			setIsConfirmOpen(false);
			posthog.capture('account:deletion-requested');
			toast({ title: t('deletionRequestedToast') });
		} catch (e: unknown) {
			handleError(e, 'error:account-deletion-request');
		}
	};

	const handleRevoke = async () => {
		try {
			await revokeMutation.mutateAsync();
			posthog.capture('account:deletion-revoked');
			toast({ title: t('deletionRevokedToast') });
		} catch (e: unknown) {
			handleError(e, 'error:account-deletion-revoke');
		}
	};

	const requestedAt = data?.requestedAt
		? new Date(data.requestedAt).toLocaleDateString(locale, { dateStyle: 'long' })
		: null;

	return (
		<Card className="border-destructive/50">
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="p-2 bg-destructive/10 rounded-lg">
						<TrashIcon className="size-5 text-destructive" />
					</div>
					<div>
						<CardTitle className="text-destructive">{t('deletionTitle')}</CardTitle>
						<CardDescription>{t('deletionDescription')}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{isPending ? (
					<Skeleton className="h-24 w-full" />
				) : isError ? (
					<p className="text-sm text-muted-foreground">{t('deletionLoadError')}</p>
				) : requestedAt ? (
					<div className="flex flex-col gap-4 p-4 rounded-lg border bg-card sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0 space-y-1">
							<p className="text-sm font-medium">
								{t('deletionRequestedAt', { date: requestedAt })}
							</p>
							<p className="text-sm text-muted-foreground">{t('deletionRequestedHint')}</p>
						</div>
						<Button
							variant="outline"
							className="shrink-0"
							onClick={handleRevoke}
							isLoading={revokeMutation.isPending}
						>
							{t('deletionRevoke')}
						</Button>
					</div>
				) : (
					<>
						<div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20 mb-4">
							<ExclamationTriangleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
							<div className="text-sm text-destructive">
								<p className="font-medium mb-1">{t('deletionWarningTitle')}</p>
								<ul className="list-disc list-inside space-y-1 text-destructive/80">
									{WARNINGS.map((key) => (
										<li key={key}>{t(key)}</li>
									))}
								</ul>
							</div>
						</div>

						<AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
							<AlertDialogTrigger asChild>
								<Button variant="destructive">{t('deletionRequestButton')}</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle className="flex items-center gap-2">
										<ExclamationTriangleIcon className="size-5 text-destructive" />
										{t('deletionConfirmTitle')}
									</AlertDialogTitle>
									<AlertDialogDescription>{t('deletionConfirmDescription')}</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
									<Button
										variant="destructive"
										onClick={handleRequest}
										isLoading={requestMutation.isPending}
									>
										{t('deletionConfirmButton')}
									</Button>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</>
				)}
			</CardContent>
		</Card>
	);
}
