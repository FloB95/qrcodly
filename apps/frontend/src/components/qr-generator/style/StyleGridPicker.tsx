'use client';

import { useCallback, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StyleGridPickerOption = {
	value: string;
	label: string;
};

interface StyleGridPickerProps {
	value: string;
	onChange: (value: string) => void;
	options: StyleGridPickerOption[];
	renderTile: (value: string, selected: boolean) => ReactNode;
	ariaLabel: string;
	columnsClassName?: string;
	compact?: boolean;
}

export const StyleGridPicker = ({
	value,
	onChange,
	options,
	renderTile,
	ariaLabel,
	columnsClassName = 'grid-cols-3',
	compact = false,
}: StyleGridPickerProps) => {
	const groupId = useId();
	const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

	const focusIndex = useCallback((index: number) => {
		const btn = buttonRefs.current[index];
		if (btn) {
			btn.focus();
		}
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
			const last = options.length - 1;
			let nextIndex: number | null = null;

			switch (event.key) {
				case 'ArrowRight':
				case 'ArrowDown':
					nextIndex = currentIndex === last ? 0 : currentIndex + 1;
					break;
				case 'ArrowLeft':
				case 'ArrowUp':
					nextIndex = currentIndex === 0 ? last : currentIndex - 1;
					break;
				case 'Home':
					nextIndex = 0;
					break;
				case 'End':
					nextIndex = last;
					break;
				default:
					return;
			}

			if (nextIndex !== null) {
				event.preventDefault();
				const nextOption = options[nextIndex];
				if (nextOption) {
					onChange(nextOption.value);
					focusIndex(nextIndex);
				}
			}
		},
		[options, onChange, focusIndex],
	);

	return (
		<div
			role="radiogroup"
			aria-label={ariaLabel}
			id={groupId}
			className={cn('flex flex-wrap gap-2', columnsClassName)}
		>
			{options.map((option, index) => {
				const selected = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={selected}
						aria-label={option.label}
						tabIndex={selected ? 0 : -1}
						ref={(el) => {
							buttonRefs.current[index] = el;
						}}
						onClick={() => onChange(option.value)}
						onKeyDown={(event) => handleKeyDown(event, index)}
						className={cn(
							'group flex flex-col items-center gap-2 rounded-lg border bg-white p-2.5 transition-all',
							compact ? 'w-[76px]' : 'w-[88px]',
							'cursor-pointer hover:border-muted-foreground/40 hover:shadow-sm',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
							selected ? 'border-primary/60 bg-primary/5 shadow-sm' : 'border-border',
						)}
					>
						<div
							aria-hidden="true"
							className={cn(
								'flex items-center justify-center rounded-md transition-colors',
								compact ? 'h-12 w-12' : 'h-16 w-16',
								selected ? 'text-primary' : 'text-foreground',
							)}
						>
							{renderTile(option.value, selected)}
						</div>
						<span
							className={cn(
								'text-center text-[11px] leading-tight',
								selected ? 'font-medium text-primary' : 'text-muted-foreground',
							)}
						>
							{option.label}
						</span>
					</button>
				);
			})}
		</div>
	);
};
