'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

export type ColorTheme = 'amber' | 'blue' | 'emerald' | 'purple' | 'rose' | 'slate';

const OVERLAY_THEMES: Record<ColorTheme, string> = {
	amber: 'from-amber-900/20 to-transparent',
	blue: 'from-blue-900/20 to-transparent',
	emerald: 'from-emerald-900/20 to-transparent',
	purple: 'from-purple-900/20 to-transparent',
	rose: 'from-rose-900/20 to-transparent',
	slate: 'from-slate-900/20 to-transparent',
};

export function UseCaseVisual({
	imageUrl,
	alt,
	theme = 'amber',
}: {
	imageUrl: string;
	alt: string;
	theme?: ColorTheme;
}) {
	return (
		<motion.div
			className="relative rounded-3xl overflow-hidden min-h-[280px] sm:min-h-[340px] shadow-lg"
			initial={{ scale: 0.95, opacity: 0 }}
			whileInView={{ scale: 1, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ duration: 0.5 }}
		>
			<Image
				src={imageUrl}
				alt={alt}
				fill
				className="object-cover"
				sizes="(max-width: 768px) 100vw, 50vw"
			/>
			<div
				className={`absolute inset-0 bg-gradient-to-t ${OVERLAY_THEMES[theme]} pointer-events-none`}
			/>
		</motion.div>
	);
}
