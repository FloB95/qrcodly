'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, Loader2 } from 'lucide-react';
import { ShareIcon } from '@heroicons/react/24/solid';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { env } from '@/env';
import {
	useQrCodeShareQuery,
	useCreateQrCodeShareMutation,
	useUpdateQrCodeShareMutation,
	useDeleteQrCodeShareMutation,
} from '@/lib/api/qr-code-share';
import type { TQrCodeShareConfig } from '@shared/schemas';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle } from 'lucide-react';
import posthog from 'posthog-js';

interface ShareDialogProps {
	qrCodeId: string;
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function ShareDialog({
	qrCodeId,
	trigger,
	open: controlledOpen,
	onOpenChange,
}: ShareDialogProps) {
	const t = useTranslations();
	const [internalOpen, setInternalOpen] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;
	const [config, setConfig] = useState<TQrCodeShareConfig>({
		showName: true,
		showDownloadButton: true,
	});

	const { data: existingShare, isLoading } = useQrCodeShareQuery(qrCodeId, open);
	const createMutation = useCreateQrCodeShareMutation();
	const updateMutation = useUpdateQrCodeShareMutation();
	const deleteMutation = useDeleteQrCodeShareMutation();

	// Initialize config from existing share
	useEffect(() => {
		if (existingShare?.config) {
			setConfig(existingShare.config);
		}
	}, [existingShare]);

	const shareLink = existingShare
		? `${env.NEXT_PUBLIC_FRONTEND_URL}/s/${existingShare.shareToken}`
		: null;

	// Check if config has changed from existing share
	const hasChanges = existingShare
		? config.showName !== existingShare.config.showName ||
			config.showDownloadButton !== existingShare.config.showDownloadButton
		: false;

	const handleCreateShare = async () => {
		try {
			await createMutation.mutateAsync({
				qrCodeId,
				data: config,
			});
			posthog.capture('qr-code-share:created', { qrCodeId, config });
			toast({
				title: t('qrCode.share.created.title'),
				description: t('qrCode.share.created.description'),
			});
		} catch (error) {
			Sentry.captureException(error);
			posthog.capture('error:qr-code-share-create', { qrCodeId, error });
			toast({
				title: t('qrCode.share.error.title'),
				description: t('qrCode.share.error.description'),
				variant: 'destructive',
			});
		}
	};

	const handleUpdateShare = async () => {
		try {
			await updateMutation.mutateAsync({
				qrCodeId,
				data: config,
			});
			posthog.capture('qr-code-share:updated', { qrCodeId, config });
			toast({
				title: t('qrCode.share.updated.title'),
				description: t('qrCode.share.updated.description'),
			});
		} catch (error) {
			Sentry.captureException(error);
			posthog.capture('error:qr-code-share-update', { qrCodeId, error });
			toast({
				title: t('qrCode.share.error.title'),
				description: t('qrCode.share.error.description'),
				variant: 'destructive',
			});
		}
	};

	const handleDeleteShare = async () => {
		try {
			await deleteMutation.mutateAsync(qrCodeId);
			posthog.capture('qr-code-share:deleted', { qrCodeId });
			toast({
				title: t('qrCode.share.deleted.title'),
				description: t('qrCode.share.deleted.description'),
			});
			setOpen(false);
		} catch (error) {
			Sentry.captureException(error);
			posthog.capture('error:qr-code-share-delete', { qrCodeId, error });
			toast({
				title: t('qrCode.share.error.title'),
				description: t('qrCode.share.error.description'),
				variant: 'destructive',
			});
		}
	};

	const handleCopyLink = async () => {
		if (shareLink) {
			try {
				await navigator.clipboard.writeText(shareLink);
				posthog.capture('qr-code-share:link-copied', { qrCodeId });
				toast({
					title: t('qrCode.share.linkCopied.title'),
					description: t('qrCode.share.linkCopied.description'),
				});
			} catch (error) {
				Sentry.captureException(error);
				toast({
					title: t('qrCode.share.error.title'),
					description: t('qrCode.share.copyError.description'),
					variant: 'destructive',
				});
			}
		}
	};

	const isUpdating =
		createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

	const defaultTrigger = (
		<Button variant="link">
			<ShareIcon className="h-5 w-5 mr-2" />
			{t('general.share')}
		</Button>
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger !== undefined ? trigger : <DialogTrigger asChild>{defaultTrigger}</DialogTrigger>}

			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t('qrCode.share.title')}</DialogTitle>
					<DialogDescription>{t('qrCode.share.description')}</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex justify-center py-4">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-4">
						{/* Warning Alert */}
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{t('qrCode.share.warning')}</AlertDescription>
						</Alert>

						{/* Share Link (if exists) */}
						{shareLink && (
							<div className="space-y-2">
								<Label>{t('qrCode.share.link')}</Label>
								<div className="flex items-center gap-2 bg-muted p-3 rounded">
									<code className="flex-1 break-all text-sm">{shareLink}</code>
									<Button variant="outline" size="sm" onClick={handleCopyLink}>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}

						{/* Display Options */}
						<div className="space-y-3">
							<Label>{t('qrCode.share.displayOptions')}</Label>

							<div className="flex items-center justify-between">
								<Label htmlFor="show-name" className="font-normal">
									{t('qrCode.share.showName')}
								</Label>
								<Switch
									id="show-name"
									checked={config.showName}
									onCheckedChange={(checked) =>
										setConfig((prev) => ({ ...prev, showName: checked }))
									}
									disabled={isUpdating}
								/>
							</div>

							<div className="flex items-center justify-between">
								<Label htmlFor="show-download" className="font-normal">
									{t('qrCode.share.showDownloadButton')}
								</Label>
								<Switch
									id="show-download"
									checked={config.showDownloadButton}
									onCheckedChange={(checked) =>
										setConfig((prev) => ({ ...prev, showDownloadButton: checked }))
									}
									disabled={isUpdating}
								/>
							</div>
						</div>
					</div>
				)}

				<DialogFooter className="flex-col sm:flex-row gap-2">
					{existingShare ? (
						<>
							<Button
								variant="destructive"
								onClick={handleDeleteShare}
								disabled={isUpdating}
								className="w-full sm:w-auto"
							>
								{deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{t('qrCode.share.deleteLink')}
							</Button>
							<Button
								onClick={handleUpdateShare}
								disabled={isUpdating || !hasChanges}
								className="w-full sm:w-auto"
							>
								{updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{t('qrCode.share.updateLink')}
							</Button>
						</>
					) : (
						<>
							<Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
								{t('general.cancel')}
							</Button>
							<Button
								onClick={handleCreateShare}
								disabled={isUpdating}
								className="w-full sm:w-auto"
							>
								{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{t('qrCode.share.createLink')}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
