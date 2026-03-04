'use client';

import { useState, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { LightBulbIcon, XMarkIcon } from '@heroicons/react/20/solid';
import type { SmartTipStateContext } from './tips.config';
import { useSmartTips } from './hooks/useSmartTips';

type SmartTipPopoverProps = {
	anchor: string;
	stateContext?: SmartTipStateContext;
	children: ReactNode;
};

function SmartTipPopoverInner({
	activeTip,
	close,
	dismiss,
	disableAll,
	children,
}: {
	activeTip: NonNullable<ReturnType<typeof useSmartTips>['activeTip']>;
	close: () => void;
	dismiss: () => void;
	disableAll: () => void;
	children: ReactNode;
}) {
	const t = useTranslations('smartTips');
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [buttonEl, setButtonEl] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => setOpen(true), 500);
		return () => clearTimeout(timer);
	}, []);

	// Find the first button inside our container to anchor the popover + pulse dot
	useEffect(() => {
		if (containerRef.current) {
			const btn = containerRef.current.querySelector('button');
			if (btn) {
				// Ensure position: relative so the pulse dot positions correctly
				btn.style.position = 'relative';
				btn.style.overflow = 'visible';
				setButtonEl(btn);
			}
		}
	}, []);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					setOpen(false);
					close();
				}
			}}
		>
			<PopoverAnchor
				virtualRef={buttonEl ? ({ current: buttonEl } as RefObject<HTMLElement>) : undefined}
			/>
			<div ref={containerRef} style={{ display: 'contents' }}>
				{children}
			</div>
			{/* Pulse dot portalled into the button element */}
			{!open &&
				buttonEl &&
				createPortal(
					<span className="absolute -top-1 -right-1 flex size-3 pointer-events-none z-10">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75" />
						<span className="relative inline-flex size-3 rounded-full bg-primary" />
					</span>,
					buttonEl,
				)}
			<PopoverContent className="w-[320px] p-0 rounded-xl shadow-lg" align="end" sideOffset={8}>
				<div className="relative p-5">
					{/* Close button */}
					<button
						onClick={() => {
							setOpen(false);
							close();
						}}
						className="absolute top-3 right-3 cursor-pointer text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
					>
						<XMarkIcon className="size-3.5" />
					</button>

					{/* Icon + label */}
					<div className="flex items-center gap-1.5 mb-3">
						<div className="flex items-center justify-center size-6 rounded-full bg-amber-100 dark:bg-amber-900/40">
							<LightBulbIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
						</div>
						<span className="text-[11px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
							{t('tipLabel')}
						</span>
					</div>

					{/* Content */}
					<p className="text-sm font-semibold text-foreground leading-snug mb-1.5">
						{t(`${activeTip.i18nKey}.title`)}
					</p>
					<p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
						{t(`${activeTip.i18nKey}.description`)}
					</p>

					{/* Actions */}
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							className="h-8 text-xs px-4 rounded-lg"
							onClick={() => {
								setOpen(false);
								close();
							}}
						>
							{t('gotIt')}
						</Button>
						<Button
							size="sm"
							variant="outline"
							className="h-8 text-xs px-4 rounded-lg"
							onClick={() => {
								setOpen(false);
								dismiss();
							}}
						>
							{t('dontShowAgain')}
						</Button>
					</div>

					{/* Disable all link */}
					<button
						onClick={() => {
							setOpen(false);
							disableAll();
						}}
						className="mt-4 cursor-pointer text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
					>
						{t('disableAll')}
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export function SmartTipPopover({ anchor, stateContext, children }: SmartTipPopoverProps) {
	const { activeTip, close, dismiss, disableAll } = useSmartTips(anchor, stateContext);

	if (!activeTip) {
		return <>{children}</>;
	}

	return (
		<SmartTipPopoverInner
			activeTip={activeTip}
			close={close}
			dismiss={dismiss}
			disableAll={disableAll}
		>
			{children}
		</SmartTipPopoverInner>
	);
}
