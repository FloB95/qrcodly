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

const data = {
	navMain: [
		{
			title: 'Profile',
			url: 'profile',
			icon: UserIcon,
		},
		{
			title: 'Security',
			url: 'security',
			icon: ShieldCheckIcon,
		},
		{
			title: 'Billing',
			url: 'billing',
			icon: CreditCardIcon,
		},
		{
			title: 'API-Keys',
			url: 'api-keys',
			icon: CodeBracketIcon,
		},
		{
			title: 'Domains',
			url: 'domains',
			icon: GlobeAltIcon,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="offcanvas" className="min-w-64 pt-5" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<div className="text-md ml-2 font-semibold">Settings</div>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
			</SidebarContent>
		</Sidebar>
	);
}
