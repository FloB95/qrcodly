'use client';

import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { Eyebrow } from '@/components/marketing/SectionHead';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';

function parseStatValue(value: string) {
	const match = /^([^0-9]*?)(\d[\d,.\s]*\d|\d)(.*)$/.exec(value);
	if (!match) return null;

	const prefix = match[1] ?? '';
	const numStr = match[2] ?? '';
	const suffix = match[3] ?? '';
	// Don't parse values like "24/7" where the suffix continues the number
	if (/^\/\d/.test(suffix)) return null;

	// Only animate whole numbers with optional thousands separators.
	// Fall back to the raw value for decimals like `99.9%` or `1.5M`.
	if (/[,.]/.test(numStr) && !/^\d{1,3}(?:([,.\s])\d{3})*$/.test(numStr)) {
		return null;
	}

	const cleanNum = numStr.replace(/[,.\s]/g, '');
	const number = parseInt(cleanNum, 10);
	if (isNaN(number)) return null;

	const formatNumber = (n: number): string => {
		if (n < 1000) return String(n);
		const separatorMatch = /\d([,.\s])\d{3}/.exec(numStr);
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
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

export function ProductStatsBar({
	stats,
	eyebrow,
	title,
}: {
	stats: Array<{ value: string; label: string }>;
	eyebrow?: string;
	title?: string;
}) {
	return (
		<section className="-mx-4 my-8 bg-slate-900 text-white sm:mx-0 sm:my-12">
			<Container>
				<div className="flex flex-col gap-8 px-4 py-11 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-8">
					{(eyebrow || title) && (
						<div className="flex max-w-md flex-col gap-1.5">
							{eyebrow && <Eyebrow className="text-amber-400">{eyebrow}</Eyebrow>}
							{title && (
								<p className="text-2xl font-bold tracking-tight text-balance sm:text-[26px]">
									{title}
								</p>
							)}
						</div>
					)}
					<dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:flex sm:flex-wrap sm:gap-12">
						{stats.map((stat, i) => (
							<AnimateOnScroll
								key={stat.label}
								delay={i * 0.08}
								className="flex flex-col-reverse gap-1"
							>
								<dt className="text-sm text-slate-400">{stat.label}</dt>
								<dd>
									<AnimatedStatValue
										value={stat.value}
										delay={i * 0.08}
										className="text-3xl font-extrabold tracking-tight sm:text-[40px] sm:leading-none"
									/>
								</dd>
							</AnimateOnScroll>
						))}
					</dl>
				</div>
			</Container>
		</section>
	);
}
