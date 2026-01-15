'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

interface AnimatedCounterProps {
	value: number;
	className?: string;
}

export const AnimatedCounter = ({ value, className }: AnimatedCounterProps) => {
	const count = useMotionValue(0);
	const rounded = useTransform(count, (latest) => Math.round(latest));

	useEffect(() => {
		const controls = animate(count, value, {
			duration: 1,
			ease: 'easeOut',
		});

		return controls.stop;
	}, [count, value]);

	return <motion.span className={className}>{rounded}</motion.span>;
};
