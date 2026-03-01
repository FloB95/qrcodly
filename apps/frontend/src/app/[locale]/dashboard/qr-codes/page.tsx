'use client';

import { QrCodeList } from '@/components/dashboard/qrCode/QrCodeList';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { QrCodeIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { TQrCodeContentType } from '@shared/schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BulkImport } from '@/components/qr-generator/content/BulkImport';
import { BulkExportDialog } from '@/components/dashboard/qrCode/BulkExportDialog';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { SmartTipsBehaviorTrackerProvider } from '@/components/dashboard/smart-tips/SmartTipsBehaviorTracker';

export default function QrCodesPage() {
	const t = useTranslations('collection');
	const tContent = useTranslations('generator.contentSwitch');
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [selectedContentType, setSelectedContentType] = useState<TQrCodeContentType | null>(null);

	const handleContentTypeSelect = (contentType: TQrCodeContentType) => {
		setSelectedContentType(contentType);
		setImportDialogOpen(true);
	};

	return (
		<QrCodeGeneratorStoreProvider>
			<SmartTipsBehaviorTrackerProvider>
				<Card className="@container/card">
					<CardContent className="relative px-4 sm:px-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<div className="flex items-center gap-3">
								<div className="p-3 bg-primary/10 rounded-lg">
									<QrCodeIcon className="size-6 sm:size-8 stroke-1" />
								</div>
								<div>
									<CardTitle className="mb-0.5">{t('tabQrCode')}</CardTitle>
									<CardDescription>{t('subHeadline')}</CardDescription>
								</div>
							</div>
							<Link
								href="/"
								className={cn(buttonVariants({ size: 'sm' }), 'gap-2 self-end sm:self-auto')}
							>
								<PlusIcon className="size-4" />
								<span className="sm:hidden lg:inline whitespace-nowrap">{t('addQrCodeBtn')}</span>
							</Link>
						</div>
					</CardContent>
				</Card>

				<QrCodeList
					onBulkImport={handleContentTypeSelect}
					onBulkExport={() => setExportDialogOpen(true)}
				/>

				{/* Bulk Import Dialog */}
				<Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
					<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle hidden>{tContent('bulkModeBtn')}</DialogTitle>
						</DialogHeader>
						{selectedContentType && (
							<BulkImport
								contentType={selectedContentType}
								onComplete={() => setImportDialogOpen(false)}
							/>
						)}
					</DialogContent>
				</Dialog>

				{/* Bulk Export Dialog */}
				<BulkExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
			</SmartTipsBehaviorTrackerProvider>
		</QrCodeGeneratorStoreProvider>
	);
}
