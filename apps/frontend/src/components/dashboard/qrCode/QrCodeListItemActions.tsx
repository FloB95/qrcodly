'use client';

import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
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
import { Button } from '@/components/ui/button';
import {
	QrCodeMenuItems,
	type MenuComponents,
	type QrCodeMenuItemsActionProps,
} from './QrCodeMenuItems';

const dropdownComponents: MenuComponents = {
	Item: DropdownMenuItem,
	Label: DropdownMenuLabel,
	Separator: DropdownMenuSeparator,
	Sub: DropdownMenuSub,
	SubTrigger: DropdownMenuSubTrigger,
	SubContent: DropdownMenuSubContent,
};

interface QrCodeListItemActionsProps extends QrCodeMenuItemsActionProps {
	isDeleting: boolean;
}

export const QrCodeListItemActions = ({
	isDeleting,
	...menuItemProps
}: QrCodeListItemActionsProps) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="icon" variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
					<EllipsisVerticalIcon className="size-6" />
					<span className="sr-only">Toggle menu</span>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<QrCodeMenuItems components={dropdownComponents} {...menuItemProps} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
