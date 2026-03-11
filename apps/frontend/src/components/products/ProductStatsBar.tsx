'use client';

import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';

function parseStatValue(value: string) {
	const match = value.match(/^([^0-9]*?)(\d[\d,.\s]*\d|\d)(.*)$/);
	if (!match) return null;

	const prefix = match[1] ?? '';
	const numStr = match[2] ?? '';
	const suffix = match[3] ?? '';
	// Don't parse values like "24/7" where the suffix continues the number
	if (/^\/\d/.test(suffix)) return null;

	const cleanNum = numStr.replace(/[,.\s]/g, '');
	const number = parseInt(cleanNum, 10);
	if (isNaN(number)) return null;

	const formatNumber = (n: number): string => {
		if (n < 1000) return String(n);
		const separatorMatch = numStr.match(/\d([,.\s])\d{3}/);
		if (separatorMatch) {
			const sep = separatorMatch[1]!;
			return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
		}
		return String(n);
	};

	return { prefix, number, suffix, formatNumber };
}

function AnimatedStatValue({
	value,
	delay,
	className,
}: {
	value: string;
	delay: number;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true });
	const parsed = parseStatValue(value);

	const count = useMotionValue(0);
	const formatted = useTransform(count, (latest) => {
		const rounded = Math.round(latest);
		return parsed ? parsed.formatNumber(rounded) : String(rounded);
	});

	useEffect(() => {
		if (!isInView || !parsed) return;
		const controls = animate(count, parsed.number, {
			duration: 1.5,
			ease: 'easeOut',
			delay,
		});
		return controls.stop;
	}, [isInView, count, parsed?.number, delay]);

	if (!parsed) {
		return (
			<motion.div
				ref={ref}
				className={className}
				initial={{ opacity: 0 }}
				whileInView={{ opacity: 1 }}
				viewport={{ once: true }}
				transition={{ duration: 0.5, delay }}
			>
				{value}
			</motion.div>
		);
	}

	return (
		<div ref={ref} className={className}>
			{parsed.prefix}
			<motion.span>{formatted}</motion.span>
			{parsed.suffix}
		</div>
	);
}

export function ProductStatsBar({ stats }: { stats: Array<{ value: string; label: string }> }) {
	return (
		<div className="py-16 sm:py-20">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-10 sm:px-10 sm:py-14">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
							{stats.map((stat, i) => (
								<AnimateOnScroll key={stat.label} delay={i * 0.1}>
									<div className="relative text-center">
										{i > 0 && (
											<div className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:block w-px h-12 bg-slate-700/50" />
										)}
										<AnimatedStatValue
											value={stat.value}
											delay={i * 0.1}
											className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight"
										/>
										<div className="text-sm sm:text-base text-slate-400 mt-2 font-medium">
											{stat.label}
										</div>
									</div>
								</AnimateOnScroll>
							))}
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
}
