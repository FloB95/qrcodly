'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedIconProps {
	children: ReactNode;
	delay?: number;
}

export const AnimatedIcon = ({ children, delay = 0 }: AnimatedIconProps) => (
	<motion.div
		className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-white"
		initial={{ opacity: 0, scale: 0.8 }}
		whileInView={{ opacity: 1, scale: 1 }}
		viewport={{ once: true }}
		transition={{ duration: 0.5, delay }}
	>
		{children}
	</motion.div>
);
