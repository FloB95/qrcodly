'use client';

import { QrCodeList } from '@/components/dashboard/qrCode/QrCodeList';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import {
	QrCodeIcon,
	ArrowUpTrayIcon,
	ArrowDownTrayIcon,
	EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { TQrCodeContentType } from '@shared/schemas';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BulkImport } from '@/components/qr-generator/content/BulkImport';
import { BulkExportDialog } from '@/components/dashboard/qrCode/BulkExportDialog';
import { BULK_ENABLED_CONTENT_TYPES, getContentTypeConfig } from '@/lib/content-type.config';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';

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
						<div className="flex items-center gap-2">
							{/* New QR Code */}
							<Link href="/" className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}>
								<PlusIcon className="size-4" />
								<span className="sr-only lg:not-sr-only lg:whitespace-nowrap">
									{t('addQrCodeBtn')}
								</span>
							</Link>

							{/* Import / Export dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="icon" className="gap-2">
										<EllipsisVerticalIcon className="size-6" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{/* Bulk Import submenu */}
									<DropdownMenuSub>
										<DropdownMenuSubTrigger className="gap-2">
											<ArrowUpTrayIcon className="h-4 w-4" />
											{tContent('bulkModeBtn')}
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent>
											<DropdownMenuLabel>{t('bulkImportLabel')}</DropdownMenuLabel>
											<DropdownMenuSeparator />
											{BULK_ENABLED_CONTENT_TYPES.map((contentType) => {
												const config = getContentTypeConfig(contentType);
												const Icon = config?.icon;
												return (
													<DropdownMenuItem
														key={contentType}
														onClick={() => handleContentTypeSelect(contentType)}
														className="cursor-pointer"
													>
														{Icon && <Icon className="mr-2 h-4 w-4" />}
														{tContent(`tab.${config?.label || contentType}`)}
													</DropdownMenuItem>
												);
											})}
										</DropdownMenuSubContent>
									</DropdownMenuSub>

									{/* Export */}
									<DropdownMenuItem
										onClick={() => setExportDialogOpen(true)}
										className="cursor-pointer gap-2"
									>
										<ArrowDownTrayIcon className="h-4 w-4" />
										{t('exportBtn')}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</CardContent>
			</Card>

			<QrCodeList />

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
		</QrCodeGeneratorStoreProvider>
	);
}
