'use client';

import { motion, type TargetAndTransition } from 'framer-motion';
import type { ReactNode } from 'react';

type AnimationVariant = 'fadeUp' | 'slideLeft' | 'slideRight' | 'fadeIn';

const variants: Record<
	AnimationVariant,
	{ initial: TargetAndTransition; animate: TargetAndTransition }
> = {
	fadeUp: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
	slideLeft: { initial: { opacity: 0, x: -30 }, animate: { opacity: 1, x: 0 } },
	slideRight: { initial: { opacity: 0, x: 30 }, animate: { opacity: 1, x: 0 } },
	fadeIn: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } },
};

export function AnimateOnScroll({
	children,
	variant = 'fadeIn',
	className,
	delay = 0,
}: {
	children: ReactNode;
	variant?: AnimationVariant;
	className?: string;
	delay?: number;
}) {
	const { initial, animate } = variants[variant];
	return (
		<motion.div
			className={className}
			initial={initial}
			whileInView={animate}
			viewport={{ once: true }}
			transition={{ duration: 0.6, delay }}
		>
			{children}
		</motion.div>
	);
}

export function AnimateOnLoad({
	children,
	variant = 'fadeUp',
	className,
	delay = 0,
}: {
	children: ReactNode;
	variant?: AnimationVariant;
	className?: string;
	delay?: number;
}) {
	const { initial, animate } = variants[variant];
	return (
		<motion.div
			className={className}
			initial={initial}
			animate={animate}
			transition={{ duration: 0.5, delay }}
		>
			{children}
		</motion.div>
	);
}
