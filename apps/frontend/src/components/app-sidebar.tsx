'use client';

import * as React from 'react';

import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu } from '@/components/ui/sidebar';
import {
	CodeBracketIcon,
	CreditCardIcon,
	GlobeAltIcon,
	ShieldCheckIcon,
	UserIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const t = useTranslations('settings.nav');

	const navMain = [
		{
			title: t('profile'),
			url: 'profile',
			icon: UserIcon,
		},
		{
			title: t('security'),
			url: 'security',
			icon: ShieldCheckIcon,
		},
		{
			title: t('billing'),
			url: 'billing',
			icon: CreditCardIcon,
		},
		{
			title: t('apiKeys'),
			url: 'api-keys',
			icon: CodeBracketIcon,
		},
		{
			title: t('domains'),
			url: 'domains',
			icon: GlobeAltIcon,
		},
	];

	return (
		<Sidebar collapsible="offcanvas" className="min-w-64 pt-5" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<div className="text-md ml-2 font-semibold">{t('title')}</div>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navMain} />
			</SidebarContent>
		</Sidebar>
	);
}
