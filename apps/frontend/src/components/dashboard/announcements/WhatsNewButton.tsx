'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { SparklesIcon } from '@heroicons/react/24/outline';
import posthog from 'posthog-js';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Announcement } from './announcements.config';
import { AnnouncementDialog } from './AnnouncementDialog';
import { NewBadge } from './NewBadge';
import { useAnnouncements } from './use-announcements';

/** "What's new" in the dashboard header, with a dot while something in it is new to the user. */
export function WhatsNewButton() {
	const t = useTranslations('announcements');
	const isMobile = useIsMobile();
	const { listed, isUnseen, hasUnseen, markSeen } = useAnnouncements();
	const [listOpen, setListOpen] = useState(false);
	// unseen when the list was opened: the pills stay while the user reads it
	const [unseenInList, setUnseenInList] = useState<string[]>([]);
	const [selected, setSelected] = useState<Announcement | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	if (listed.length === 0) return null;

	const onListOpenChange = (open: boolean) => {
		if (open) {
			const unseen = listed.filter(isUnseen).map((a) => a.id);
			posthog.capture('announcements:list-opened', { unseen: unseen.length });
			setUnseenInList(unseen);
			markSeen();
		}
		setListOpen(open);
	};

	const openAnnouncement = (announcement: Announcement) => {
		setListOpen(false);
		posthog.capture('announcements:opened', { id: announcement.id });
		setSelected(announcement);
		setDialogOpen(true);
	};

	const trigger = (
		<button
			className={cn(
				'flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground',
				hasUnseen ? 'text-foreground' : 'text-muted-foreground',
			)}
		>
			<span className="relative">
				<SparklesIcon aria-hidden="true" className="size-4" />
				{hasUnseen && (
					<span
						aria-hidden="true"
						className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 ring-2 ring-background"
					/>
				)}
			</span>
			<span className="text-xs xs:text-sm">{t('trigger')}</span>
			{hasUnseen && <span className="sr-only">{t('unseen')}</span>}
		</button>
	);

	const list = (
		<AnnouncementList announcements={listed} unseen={unseenInList} onOpen={openAnnouncement} />
	);

	return (
		<>
			{isMobile ? (
				<Drawer open={listOpen} onOpenChange={onListOpenChange}>
					<DrawerTrigger asChild>{trigger}</DrawerTrigger>
					<DrawerContent>
						<DrawerHeader>
							<DrawerTitle>{t('title')}</DrawerTitle>
						</DrawerHeader>
						{list}
					</DrawerContent>
				</Drawer>
			) : (
				<Popover open={listOpen} onOpenChange={onListOpenChange}>
					<PopoverTrigger asChild>{trigger}</PopoverTrigger>
					<PopoverContent
						className="w-[360px] rounded-2xl border-slate-200 p-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
						side="bottom"
						align="end"
						sideOffset={8}
					>
						<p className="px-5 pt-5 pb-2 text-sm font-semibold text-slate-900">{t('title')}</p>
						{list}
					</PopoverContent>
				</Popover>
			)}
			{/* sits between this button and "Help & support" next to it */}
			<span aria-hidden="true" className="h-4 w-px bg-border" />
			<AnnouncementDialog announcement={selected} open={dialogOpen} onOpenChange={setDialogOpen} />
		</>
	);
}

function AnnouncementList({
	announcements,
	unseen,
	onOpen,
}: {
	announcements: Announcement[];
	unseen: string[];
	onOpen: (announcement: Announcement) => void;
}) {
	const t = useTranslations('announcements');
	const format = useFormatter();

	return (
		<ul className="px-2 pb-2">
			{announcements.map((announcement) => {
				const key = `items.${announcement.i18nKey}`;
				return (
					<li key={announcement.id}>
						<button
							onClick={() => onOpen(announcement)}
							className="group w-full cursor-pointer rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
						>
							<span className="flex items-center gap-2">
								<span className="text-sm font-medium text-slate-900">{t(`${key}.title`)}</span>
								{unseen.includes(announcement.id) && <NewBadge />}
							</span>
							<span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
								{t(`${key}.summary`)}
							</span>
							<span className="mt-2 flex items-center justify-between text-xs">
								<time dateTime={announcement.date} className="text-muted-foreground">
									{format.dateTime(new Date(announcement.date), {
										day: 'numeric',
										month: 'long',
									})}
								</time>
								<span className="font-medium text-slate-900 group-hover:underline">
									{t('learnMore')}
								</span>
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
