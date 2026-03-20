'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { HelpSupportContent } from './HelpSupportContent';

export function HelpSupportHeaderButton() {
	const t = useTranslations('helpSupport');
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);

	const trigger = (
		<button
			className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
			aria-label={t('fabLabel')}
		>
			<span className="text-xs xs:text-sm">{t('fabLabel')}</span>
			<QuestionMarkCircleIcon className="size-4" />
		</button>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTrigger asChild>{trigger}</DrawerTrigger>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{t('title')}</DrawerTitle>
					</DrawerHeader>
					<HelpSupportContent onClose={() => setOpen(false)} />
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent
				className="w-[340px] p-0 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-slate-200"
				side="bottom"
				align="end"
				sideOffset={8}
			>
				<HelpSupportContent onClose={() => setOpen(false)} />
			</PopoverContent>
		</Popover>
	);
}
