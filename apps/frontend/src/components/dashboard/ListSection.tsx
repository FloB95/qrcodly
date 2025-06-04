'use client';

import { QrCodeList } from '@/components/dashboard/qrCode/QrCodeList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCodeIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export const ListSection = () => {
	const router = useRouter();

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
				<TabsList>
					<TabsTrigger value="qrCodeList">
						<div className="flex space-x-2">
							<QrCodeIcon width={20} height={20} /> <span>QR Codes</span>
						</div>
					</TabsTrigger>
					{/* <TabsTrigger value="templateList">
						<div className="flex space-x-2">
							<StarIcon width={20} height={20} /> <span>Templates</span>
						</div>
					</TabsTrigger> */}
				</TabsList>
				{/* <div className="ml-auto flex items-center gap-2">
					<DropdownMenu>
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
					</Button>
					<Button size="sm" className="h-9 gap-1" disabled>
						<PlusCircleIcon className="h-4 w-4" />
						<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add QR code</span>
					</Button>
				</div> */}
			</div>
			<div className="mx-auto flex-1">
				<TabsContent value="qrCodeList">
					<QrCodeList />
				</TabsContent>
				{/* <TabsContent value="templateList">
					<TemplateList />
				</TabsContent> */}
			</div>
		</Tabs>
	);
};
