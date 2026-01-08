'use client';

import { useState, useEffect, useCallback } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Badge } from '../ui/badge';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { useAuth } from '@clerk/nextjs';
import { LoginRequiredDialog } from './LoginRequiredDialog';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type DynamicBadgeProps = {
	className?: string;
	checked?: boolean;
	onChange?: (checked: boolean) => void;
};

export const DynamicBadge = ({ className = '', checked, onChange }: DynamicBadgeProps) => {
	const t = useTranslations();
	const isInteractive = onChange !== undefined;
	const isChecked = checked ?? false;
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const { content, config } = useQrCodeGeneratorStore((state) => state);
	const [showTooltip, setShowTooltip] = useState(false);

	// Show tooltip once for unsigned users after 1 second
	useEffect(() => {
		if (!isInteractive || isSignedIn || isChecked) return;

		const hasSeenTooltip = sessionStorage.getItem('dynamicBadgeTooltipSeen');
		if (hasSeenTooltip) return;

		const timer = setTimeout(() => {
			setShowTooltip(true);
			sessionStorage.setItem('dynamicBadgeTooltipSeen', 'true');

			// Auto-hide tooltip after 5 seconds
			setTimeout(() => setShowTooltip(false), 5000);
		}, 1000);

		return () => clearTimeout(timer);
	}, [isInteractive, isSignedIn, isChecked]);

	const handleChange = useCallback(
		(checked: boolean) => {
			if (!onChange) return;

			if (!isSignedIn) {
				localStorage.setItem('unsavedQrContent', JSON.stringify(content));
				localStorage.setItem('unsavedQrConfig', JSON.stringify(config));
				setAlertOpen(true);
				return;
			}

			onChange(checked);
		},
		[onChange, isSignedIn, content, config],
	);

	const badgeElement = (
		<Badge
			className={cn(
				'py-2 transition-all duration-300 cursor-pointer relative overflow-hidden',
				isChecked || !isInteractive
					? 'bg-teal-800 hover:bg-teal-900 text-white border-teal-800 border-2'
					: 'bg-transparent hover:bg-teal-50 text-teal-800 border-teal-800 border-2',
				className,
			)}
			variant={isChecked ? 'default' : 'outline'}
			onClick={(e) => {
				if (isInteractive) {
					e.preventDefault();
					handleChange(!isChecked);
				}
			}}
		>
			<span className="transition-opacity duration-200">Dynamic</span>
			{isInteractive ? (
				<Switch
					size="sm"
					checked={isChecked}
					onCheckedChange={handleChange}
					className={cn(
						'ml-2 transition-transform duration-300 data-[state=checked]:bg-teal-500!',
						isChecked ? 'scale-100' : 'scale-95',
					)}
					onClick={(e) => e.stopPropagation()}
				/>
			) : (
				<CheckBadgeIcon
					className={cn(
						'ml-2 h-5 w-5 transition-all duration-300',
						isChecked ? 'rotate-0 scale-100' : 'rotate-12 scale-90',
					)}
				/>
			)}
		</Badge>
	);

	return (
		<>
			<TooltipProvider>
				<div className="relative inline-block">
					<HoverCard>
						<HoverCardTrigger asChild>{badgeElement}</HoverCardTrigger>
						<HoverCardContent className="w-80 py-4 text-sm leading-relaxed">
							{t('general.dynamicDescription')}
						</HoverCardContent>
					</HoverCard>
					<Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
						<TooltipTrigger asChild>
							<div className="absolute inset-0 pointer-events-none" />
						</TooltipTrigger>
						<TooltipContent side="top" className="max-w-xs">
							<p
								className="text-sm"
								dangerouslySetInnerHTML={{ __html: String(t.raw('general.dynamicBadgeTooltip')) }}
							/>
						</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>
			{isInteractive && <LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />}
		</>
	);
};
