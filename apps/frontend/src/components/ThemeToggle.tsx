'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ThemeOption = 'light' | 'dark' | 'system';

export function ThemeToggle({
	className,
	align = 'end',
}: {
	className?: string;
	align?: 'start' | 'center' | 'end';
}) {
	const t = useTranslations('theme');
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const options: { value: ThemeOption; label: string; Icon: typeof SunIcon }[] = [
		{ value: 'light', label: t('light'), Icon: SunIcon },
		{ value: 'dark', label: t('dark'), Icon: MoonIcon },
		{ value: 'system', label: t('system'), Icon: ComputerDesktopIcon },
	];

	const TriggerIcon = mounted && resolvedTheme === 'dark' ? MoonIcon : SunIcon;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t('toggle')}
					className={cn('cursor-pointer', className)}
				>
					<TriggerIcon className="h-5 w-5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align} className="min-w-[10rem]">
				{options.map(({ value, label, Icon }) => {
					const isActive = mounted && theme === value;
					return (
						<DropdownMenuItem
							key={value}
							onSelect={() => setTheme(value)}
							className="cursor-pointer"
						>
							<Icon className="size-4 mr-2" />
							<span>{label}</span>
							{isActive && <CheckIcon className="size-4 ml-auto" />}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
