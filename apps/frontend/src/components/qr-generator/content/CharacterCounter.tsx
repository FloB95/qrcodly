'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CharacterCounterProps {
	current: number;
	max: number;
	className?: string;
}

export const CharacterCounter = ({ current, max, className }: CharacterCounterProps) => {
	const percentage = (current / max) * 100;
	const isNearLimit = percentage >= 90;
	const isAtLimit = current >= max;

	if (current === 0) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn('text-sm tabular-nums', className)}
		>
			<span
				className={cn(
					'transition-colors duration-200',
					isAtLimit
						? 'text-red-600 font-semibold'
						: isNearLimit
							? 'text-orange-600'
							: 'text-muted-foreground',
				)}
			>
				{current}
			</span>
			<span className="text-muted-foreground"></span>
		</motion.div>
	);
};
