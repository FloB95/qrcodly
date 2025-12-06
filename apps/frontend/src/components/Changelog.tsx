'use client';

import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useTranslations } from 'next-intl';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Button } from './ui/button';
import changelogs from '@/data/changelogs.json';
import posthog from 'posthog-js';

type TChangelog = {
	version: string;
	date: string;
	changes: string[];
};

export const Changelog = () => {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);

	const showChangelog = () => {
		setIsOpen(true);
		posthog.capture('visit-changelogs');
	};

	return (
		<div>
			<Tooltip>
				<TooltipTrigger asChild onClick={() => showChangelog()}>
					<DocumentTextIcon className="h-8 w-8 cursor-pointer hover:text-gray-700" />
				</TooltipTrigger>
				<TooltipContent side="left">
					<span className="font-bold">{t('general.changelogTooltip')}</span>
				</TooltipContent>
			</Tooltip>

			<Drawer direction="right" open={isOpen} onOpenChange={setIsOpen}>
				<DrawerContent className="bg-[#faf8f5]">
					<DrawerHeader>
						<DrawerClose asChild className="absolute right-4 top-2">
							<Button variant="ghost" size="icon">
								<XMarkIcon className="w-6 h-6" />
							</Button>
						</DrawerClose>
						<DrawerTitle className="flex space-x-2 pt-2 align-middle">
							<DocumentTextIcon className="h-8 w-8 cursor-pointer hover:text-gray-700" />
							<span className="pt-1">Changelog</span>
						</DrawerTitle>
					</DrawerHeader>
					<div className="px-4 mt-2 flex w-full max-w-md flex-col gap-4 overflow-y-auto mb-8">
						{changelogs.map((log: TChangelog) => (
							<div
								key={log.version}
								className="group/item flex items-center border text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border-border p-4 gap-4"
							>
								<div className="flex flex-1 flex-col gap-1 [&amp;+[data-slot=item-content]]:flex-none">
									<div className="flex items-center justify-between w-full gap-2 text-sm leading-snug font-medium text-black">
										<span>Version {log.version}</span>
										<span className="text-muted-foreground text-xs">{log.date}</span>
									</div>
									<ul className="text-sm leading-normal font-normal text-balance list-disc pl-3">
										{log.changes.map((change, index) => (
											<li key={index}>{change}</li>
										))}
									</ul>
								</div>
							</div>
						))}
					</div>
				</DrawerContent>
			</Drawer>
		</div>
	);
};
