'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuBadge,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	CodeBracketIcon,
	CreditCardIcon,
	GlobeAltIcon,
	QrCodeIcon,
	ShieldCheckIcon,
	StarIcon,
	TagIcon,
	UserIcon,
} from '@heroicons/react/24/outline';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useListQrCodesQuery } from '@/lib/api/qr-code';
import { useListConfigTemplatesQuery } from '@/lib/api/config-template';
import { useAllTagsQuery } from '@/lib/api/tag';

export function DashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const tNav = useTranslations('dashboard.nav');
	const tSettings = useTranslations('settings.nav');
	const tGeneral = useTranslations('general');
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { isLoaded, user } = useUser();
	const { data: qrCodesData } = useListQrCodesQuery(1, 1);
	const { data: templatesData } = useListConfigTemplatesQuery(undefined, 1, 1);
	const { data: allTags } = useAllTagsQuery();

	const isQrCodesPage = pathname.includes('/dashboard/qr-codes');
	const activeTagParam = searchParams.get('tag');
	const [tagsOpen, setTagsOpen] = useState(true);

	useEffect(() => {
		if (isQrCodesPage && activeTagParam) {
			setTagsOpen(true);
		}
	}, [isQrCodesPage, activeTagParam]);

	function isActive(url: string) {
		return pathname.includes(url);
	}

	const settingsItems = [
		{
			title: tSettings('profile'),
			url: '/dashboard/settings/profile',
			icon: UserIcon,
		},
		{
			title: tSettings('security'),
			url: '/dashboard/settings/security',
			icon: ShieldCheckIcon,
		},
		{
			title: tSettings('billing'),
			url: '/dashboard/settings/billing',
			icon: CreditCardIcon,
		},
		{
			title: tSettings('apiKeys'),
			url: '/dashboard/settings/api-keys',
			icon: CodeBracketIcon,
		},
		{
			title: tSettings('domains'),
			url: '/dashboard/settings/domains',
			icon: GlobeAltIcon,
		},
	];

	return (
		<Sidebar collapsible="offcanvas" className="min-w-64 pt-5" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<div className="text-md ml-2 font-semibold">Dashboard</div>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>{tNav('collection')}</SidebarGroupLabel>
					<SidebarGroupContent className="min-w-[200px]">
						<SidebarMenu>
							{/* QR Codes with collapsible tag sub-nav */}
							{allTags && allTags.length > 0 ? (
								<Collapsible open={tagsOpen} onOpenChange={setTagsOpen} asChild>
									<SidebarMenuItem>
										<SidebarMenuButton isActive={isQrCodesPage && !activeTagParam} asChild>
											<Link href="/dashboard/qr-codes">
												<QrCodeIcon />
												<span>{tNav('qrCodes')}</span>
											</Link>
										</SidebarMenuButton>
										{qrCodesData?.total !== undefined && (
											<SidebarMenuBadge className="right-7">{qrCodesData.total}</SidebarMenuBadge>
										)}
										<CollapsibleTrigger asChild>
											<SidebarMenuAction className="data-[state=open]:rotate-90 cursor-pointer">
												<ChevronRightIcon className="size-5!" />
												<span className="sr-only">Toggle</span>
											</SidebarMenuAction>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												{allTags.map((tag) => (
													<SidebarMenuSubItem key={tag.id}>
														<SidebarMenuSubButton isActive={activeTagParam === tag.id} asChild>
															<Link href={`/dashboard/qr-codes?tag=${tag.id}`}>
																<div
																	className="size-2.5 rounded-full shrink-0"
																	style={{ backgroundColor: tag.color }}
																/>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<span className="truncate max-w-[120px]">{tag.name}</span>
																	</TooltipTrigger>
																	<TooltipContent side="right">{tag.name}</TooltipContent>
																</Tooltip>
																{(tag.qrCodeCount ?? 0) > 0 && (
																	<span className="ml-auto text-xs tabular-nums text-muted-foreground">
																		{tag.qrCodeCount ?? 0}
																	</span>
																)}
															</Link>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										</CollapsibleContent>
									</SidebarMenuItem>
								</Collapsible>
							) : (
								<SidebarMenuItem>
									<SidebarMenuButton isActive={isQrCodesPage} asChild>
										<Link href="/dashboard/qr-codes">
											<QrCodeIcon />
											<span>{tNav('qrCodes')}</span>
										</Link>
									</SidebarMenuButton>
									{qrCodesData?.total !== undefined && (
										<SidebarMenuBadge>{qrCodesData.total}</SidebarMenuBadge>
									)}
								</SidebarMenuItem>
							)}

							{/* Templates */}
							<SidebarMenuItem>
								<SidebarMenuButton isActive={isActive('/dashboard/templates')} asChild>
									<Link href="/dashboard/templates">
										<StarIcon />
										<span>{tNav('templates')}</span>
									</Link>
								</SidebarMenuButton>
								{templatesData?.total !== undefined && (
									<SidebarMenuBadge>{templatesData.total}</SidebarMenuBadge>
								)}
							</SidebarMenuItem>

							{/* Tags */}
							<SidebarMenuItem>
								<SidebarMenuButton isActive={isActive('/dashboard/tags')} asChild>
									<Link href="/dashboard/tags">
										<TagIcon />
										<span>{tNav('tags')}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>{tSettings('title')}</SidebarGroupLabel>
					<SidebarGroupContent className="min-w-[200px]">
						<SidebarMenu>
							{settingsItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton isActive={isActive(item.url)} asChild>
										<Link href={item.url}>
											{item.icon && <item.icon />}
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupContent className="min-w-[200px]">
						<SidebarMenu>
							{isLoaded && user && (
								<SidebarMenuItem className="mt-2">
									<div className="flex gap-3 px-2 flex-wrap max-w-[230px]">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
											<AvatarFallback className="rounded-lg">
												{getUserInitials(user)}
											</AvatarFallback>
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
												<div>{tGeneral('signOut')}</div>
											</TooltipContent>
										</Tooltip>
									</div>
								</SidebarMenuItem>
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
