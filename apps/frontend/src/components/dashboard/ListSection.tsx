'use client';

import { QrCodeList } from '@/components/dashboard/qrCode/QrCodeList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, QrCodeIcon, StarIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { TemplateList } from './templates/TemplateList';
import Link from 'next/link';
import { buttonVariants } from '../ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export const ListSection = () => {
	const router = useRouter();
	const t = useTranslations('collection');

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
							<span className="hidden sm:block">{t('tabQrCode')}</span>
						</div>
					</TabsTrigger>
					<TabsTrigger value="templateList" className="data-[state=active]:bg-gray-200">
						<div className="sm:flex sm:space-x-2">
							<StarIcon width={20} height={20} />{' '}
							<span className="hidden sm:block">{t('tabTemplates')}</span>
						</div>
					</TabsTrigger>
				</TabsList>
				<div className="ml-auto flex items-center gap-2">
					{/* <DropdownMenu>
						<DropdownMenuTrigger asChild disabled>
							<Button variant="outline" size="sm" className="h-9 gap-1" disabled>
								<FunnelIcon className="h-4 w-4" />
								<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Filter by</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem checked>Active</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem>Draft</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem>Archived</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
