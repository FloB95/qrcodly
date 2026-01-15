'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export const Hero = () => {
	const t = useTranslations('hero');

	const benefits = [t('benefits.unlimited'), t('benefits.noSignup'), t('benefits.noWatermark')];

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.15,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.5,
				ease: 'easeInOut' as const,
			},
		},
	};

	return (
		<div className="mt-16 sm:mt-20 mb-14 text-center">
			<Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium bg-white">
				{t('badge')}
			</Badge>

			<h1 className="text-3xl xs:text-4xl sm:text-5xl font-semibold text-slate-900 mb-6">
				{t('title')}
			</h1>

			<p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-700 mb-8">{t('subtitle')}</p>

			<motion.div
				className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-700"
				variants={containerVariants}
				initial="hidden"
				animate="visible"
			>
				{benefits.map((benefit) => (
					<motion.div key={benefit} className="flex items-center gap-2" variants={itemVariants}>
						<CheckCircleIcon className="h-6 w-6 text-black" />
						<span>{benefit}</span>
					</motion.div>
				))}
			</motion.div>
		</div>
	);
};
