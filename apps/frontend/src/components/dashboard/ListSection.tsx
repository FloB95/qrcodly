'use client';

import { QrCodeList } from '@/components/dashboard/qrCode/QrCodeList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderArrowDownIcon, PlusIcon, QrCodeIcon, StarIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { TemplateList } from './templates/TemplateList';
import Link from 'next/link';
import { Button, buttonVariants } from '../ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useListConfigTemplatesQuery } from '@/lib/api/config-template';
import { useListQrCodesQuery } from '@/lib/api/qr-code';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export const ListSection = () => {
	const router = useRouter();
	const t = useTranslations('collection');

	const { data: templates } = useListConfigTemplatesQuery(undefined, 1, 1);

	const { data: qrCodes } = useListQrCodesQuery(1, 1);

	return (
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
								<FolderArrowDownIcon className="h-5 w-5" />
								<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Anzahl</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem>Auswahl</DropdownMenuItem>
							<DropdownMenuItem>Letzten 30</DropdownMenuItem>
							<DropdownMenuItem>Alle</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					{/* 
					<Button size="sm" variant="outline" className="h-9 gap-1" disabled>
						<ArrowDownOnSquareIcon className="h-4 w-4" />
						<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
					</Button> */}
					<Link href="/" className={cn(buttonVariants(), 'sm:flex sm:space-x-2')}>
						<PlusIcon className="h-5 w-5" />
						<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{t('addQrCodeBtn')}</span>
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
	);
};
