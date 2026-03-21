'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

const WorldMap = dynamic(() => import('./WorldMap').then((m) => m.WorldMap), {
	ssr: false,
	loading: () => <Skeleton className="h-[200px] w-full rounded-lg mb-4" />,
});

interface CountryMetricItem {
	label: string;
	count: number;
	code: string;
}

interface AnalyticsCountryChartProps {
	data: CountryMetricItem[];
}

export const AnalyticsCountryChart = ({ data }: AnalyticsCountryChartProps) => {
	const t = useTranslations();
	const listRef = useRef<HTMLDivElement>(null);
	const [showScrollHint, setShowScrollHint] = useState(false);
	const sorted = [...data].sort((a, b) => b.count - a.count);
	const total = data.reduce((sum, item) => sum + item.count, 0);

	useEffect(() => {
		const el = listRef.current;
		if (!el) return;
		const check = () => {
			const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
			setShowScrollHint(el.scrollHeight > el.clientHeight + 4 && !atBottom);
		};
		check();
		el.addEventListener('scroll', check, { passive: true });
		const observer = new ResizeObserver(check);
		observer.observe(el);
		return () => {
			el.removeEventListener('scroll', check);
			observer.disconnect();
		};
	}, []);

	return (
		<Card className="h-full flex flex-col">
			<CardHeader>
				<CardTitle className="text-lg">{t('chart.title.countryDistribution')}</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col min-h-0">
				{data.length === 0 ? (
					<p className="text-muted-foreground text-sm">{t('analytics.noData')}</p>
				) : (
					<>
						<WorldMap data={sorted} />
						<div className="relative flex-1 min-h-[250px] lg:min-h-0">
							<div
								ref={listRef}
								className="flex-1 overflow-y-auto pr-1 space-y-4 scroll-smooth absolute inset-0"
							>
								{sorted.map((item, index) => {
									const share = total > 0 ? Math.round((item.count / total) * 100) : 0;
									return (
										<motion.div
											key={`${item.label}-${index}`}
											initial={{ opacity: 0, x: -15 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{
												delay: index * 0.05,
												duration: 0.3,
											}}
										>
											<div className="flex items-center justify-between mb-1.5">
												<span className="text-sm font-medium truncate mr-2">{item.label}</span>
												<span className="text-sm text-muted-foreground tabular-nums shrink-0">
													{item.count} · {share === 0 && item.count > 0 ? '<1' : share}%
												</span>
											</div>
											<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
												<motion.div
													className="h-full rounded-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800"
													initial={{ width: 0 }}
													animate={{
														width: `${share}%`,
													}}
													transition={{
														delay: index * 0.05 + 0.1,
														duration: 0.5,
														ease: 'easeOut',
													}}
												/>
											</div>
										</motion.div>
									);
								})}
							</div>
							{showScrollHint && (
								<div className="absolute bottom-0 left-0 right-2 h-10 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none flex items-end justify-center pb-1">
									<ChevronDownIcon className="size-4 text-muted-foreground animate-bounce" />
								</div>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
};
