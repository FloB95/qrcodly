import { QrCodeList } from '@/components/dashboard/QrCodeList';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Container from '@/components/ui/container';
import {
	ArrowDownOnSquareIcon,
	FunnelIcon,
	PlusCircleIcon,
	QueueListIcon,
	Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { getTranslations } from 'next-intl/server';
import type { DefaultPageParams } from '@/types/page';

export default async function Collection({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale });

	return (
		<div className="mt-24 flex h-full w-full flex-1 flex-col items-center justify-center">
			<Container>
				<h1 className="mt-8 mb-4 text-center text-4xl font-bold max-w-[600px] mx-auto">
					{t('collection.headline')}
				</h1>
				<h2 className="mt-8 mb-24 text-center text-accent-foreground text-xl max-w-[850px] mx-auto sm:text-2xl">
					{t('collection.subHeadline')}
				</h2>
				<Tabs defaultValue="list">
					<div className="flex items-center">
						<TabsList>
							<TabsTrigger value="list">
								<div className="flex space-x-2">
									<QueueListIcon width={20} height={20} /> <span>List</span>
								</div>
							</TabsTrigger>
							<TabsTrigger value="cards" disabled>
								<div className="flex space-x-2">
									<Squares2X2Icon width={20} height={20} /> <span>Cards</span>
								</div>
							</TabsTrigger>
						</TabsList>
						<div className="ml-auto flex items-center gap-2">
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
						</div>
					</div>
					<div className="mx-auto flex-1">
						<TabsContent value="list">
							<QrCodeList />
						</TabsContent>
					</div>
				</Tabs>
			</Container>
		</div>
	);
}
