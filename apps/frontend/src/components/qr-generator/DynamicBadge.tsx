'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Badge } from '../ui/badge';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { useAuth } from '@clerk/nextjs';
import { LoginRequiredDialog } from './LoginRequiredDialog';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import { motion } from 'framer-motion';

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
	const [showAnimation, setShowAnimation] = useState(false);
	const hasAnimatedRef = useRef(false);
	const contentRef = useRef(content.data);

	useEffect(() => {
		if (hasAnimatedRef.current || isChecked || !isInteractive) return undefined;

		const hasContentChanged = JSON.stringify(content.data) !== JSON.stringify(contentRef.current);

		// Check if there's actual content in any field (works for url, text, wifi, vcard, email, location, event)
		const hasContent = Object.values(content.data).some(
			(val) => val !== null && val !== undefined && String(val).trim().length > 0,
		);

		if (hasContentChanged && hasContent) {
			const timer = setTimeout(() => {
				setShowAnimation(true);
				hasAnimatedRef.current = true;

				setTimeout(() => setShowAnimation(false), 1000);
			}, 200);

			return () => clearTimeout(timer);
		}

		return undefined;
	}, [content.data, isChecked, isInteractive]);

	const handleChange = (checked: boolean) => {
		if (!onChange) return;

		if (!isSignedIn) {
			localStorage.setItem('unsavedQrContent', JSON.stringify(content));
			localStorage.setItem('unsavedQrConfig', JSON.stringify(config));
			setAlertOpen(true);
			return;
		}

		onChange(checked);
	};

	return (
		<>
			<HoverCard>
				<HoverCardTrigger asChild>
					<motion.div
						style={{ position: 'relative', display: 'inline-block' }}
						animate={
							showAnimation
								? {
										x: [0, -2, 2, -2, 2, 0],
										rotate: [0, -1, 1, -1, 1, 0],
									}
								: {}
						}
						transition={{ duration: 0.4, ease: 'easeInOut' }}
					>
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
							{/* Ripple effect animation */}
							{showAnimation && (
								<motion.span
									className="absolute inset-0 rounded-[inherit]"
									style={{
										background:
											'radial-gradient(circle, rgb(20 184 166 / 0.6) 0%, transparent 70%)',
									}}
									initial={{ scale: 0, opacity: 1 }}
									animate={{ scale: 2.5, opacity: 0 }}
									transition={{ duration: 1, ease: 'easeOut' }}
								/>
							)}
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
					</motion.div>
				</HoverCardTrigger>
				<HoverCardContent className="w-80 py-4 text-sm leading-relaxed">
					{t('general.dynamicDescription')}
				</HoverCardContent>
			</HoverCard>
			{isInteractive && <LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />}
		</>
	);
};
