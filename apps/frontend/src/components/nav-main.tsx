'use client';

import { useEffect } from 'react';
import { type LucideIcon } from 'lucide-react';

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getUserInitials } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		icon?: LucideIcon;
	}[];
}) {
	const { isLoaded, user } = useUser();
	const t = useTranslations('general');
	const pathname = usePathname();
	const { setOpenMobile } = useSidebar();

	// Close mobile sidebar on navigation
	useEffect(() => {
		setOpenMobile(false);
	}, [pathname, setOpenMobile]);

	function isActive(url: string) {
		if (pathname.includes(url)) return true;
		return false;
	}

	return (
		<SidebarGroup>
			<SidebarGroupContent className="min-w-[200px] flex flex-col gap-2">
				<SidebarMenu>
					{items.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton isActive={isActive(item.url)} asChild>
								<Link href={item.url}>
									{item.icon && <item.icon />}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}

					{isLoaded && user && (
						<SidebarMenuItem className="mt-6">
							<div className="flex gap-3 px-2 flex-wrap max-w-[230px]">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
									<AvatarFallback className="rounded-lg">{getUserInitials(user)}</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user.fullName}</span>
									<span className="text-muted-foreground truncate text-xs">
										{user?.primaryEmailAddress?.emailAddress}
									</span>
								</div>
								<Tooltip>
									<TooltipTrigger asChild>
										<SignOutButton>
											<div className="cursor-pointer pl-1 align-middle items-center flex-col flex justify-center">
												<ArrowRightStartOnRectangleIcon className="size-5" />
											</div>
										</SignOutButton>
									</TooltipTrigger>
									<TooltipContent side="left">
										<div>{t('signOut')}</div>
									</TooltipContent>
								</Tooltip>
							</div>
						</SidebarMenuItem>
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
