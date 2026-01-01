'use client';

import { QrCodeList } from '@/components/dashboard/qrCode/QrCodeList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, QrCodeIcon, StarIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { TemplateList } from './templates/TemplateList';
import Link from 'next/link';
import { Button, buttonVariants } from '../ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useListConfigTemplatesQuery } from '@/lib/api/config-template';
import { useListQrCodesQuery } from '@/lib/api/qr-code';
import { useState } from 'react';
import type { TQrCodeContentType } from '@shared/schemas';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BulkImport } from '../qr-generator/content/BulkImport';
import { BULK_ENABLED_CONTENT_TYPES, getContentTypeConfig } from '@/lib/content-type.config';

export const ListSection = () => {
	const router = useRouter();
	const t = useTranslations('collection');
	const tContent = useTranslations('generator.contentSwitch');
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedContentType, setSelectedContentType] = useState<TQrCodeContentType | null>(null);

	const { data: templates } = useListConfigTemplatesQuery(undefined, 1, 1);

	const { data: qrCodes } = useListQrCodesQuery(1, 1);

	const handleContentTypeSelect = (contentType: TQrCodeContentType) => {
		setSelectedContentType(contentType);
		setDialogOpen(true);
	};

	return (
		<>
			<Tabs
				defaultValue="qrCodeList"
				onValueChange={() => {
					const url = new URL(window.location.href);
					url.searchParams.delete('page');
					router.replace(url.pathname + (url.search ? url.search : ''), { scroll: false });
				}}
			>
				<div className="flex items-center">
					<TabsList className="bg-white p-2 shadow h-auto md:min-w-[300px] grid-cols-2 grid">
						<TabsTrigger value="qrCodeList" className="data-[state=active]:bg-gray-200">
							<div className="sm:flex sm:space-x-2">
								<QrCodeIcon width={20} height={20} />{' '}
								<span className="hidden sm:block">
									{t('tabQrCode')} {qrCodes?.total ? `(${qrCodes.total})` : ''}
								</span>
							</div>
						</TabsTrigger>
						<TabsTrigger value="templateList" className="data-[state=active]:bg-gray-200">
							<div className="sm:flex sm:space-x-2">
								<StarIcon width={20} height={20} />{' '}
								<span className="hidden sm:block">
									{t('tabTemplates')} {templates?.total ? `(${templates.total})` : ''}
								</span>
							</div>
						</TabsTrigger>
					</TabsList>
					<div className="ml-auto flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="gap-2">
									<ArrowUpTrayIcon className="h-5 w-5" />
									<span className="sr-only lg:not-sr-only sm:whitespace-nowrap">
										{tContent('bulkModeBtn')}
									</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
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
							</DropdownMenuContent>
						</DropdownMenu>
						<Link href="/" className={cn(buttonVariants(), 'md:flex md:space-x-2')}>
							<PlusIcon className="h-5 w-5" />
							<span className="sr-only md:not-sr-only md:whitespace-nowrap">
								{t('addQrCodeBtn')}
							</span>
						</Link>
					</div>
				</div>
				<div className="mx-auto flex-1">
					<TabsContent value="qrCodeList">
						<QrCodeList />
					</TabsContent>
					<TabsContent value="templateList">
						<TemplateList />
					</TabsContent>
				</div>
			</Tabs>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogTitle hidden>{tContent('bulkModeBtn')}</DialogTitle>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader></DialogHeader>
					{selectedContentType && (
						<BulkImport contentType={selectedContentType} onComplete={() => setDialogOpen(false)} />
					)}
				</DialogContent>
			</Dialog>
		</>
	);
};
