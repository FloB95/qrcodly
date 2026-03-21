'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface MetricItem {
	label: string;
	count: number;
}

interface AnalyticsBrowserChartProps {
	data: MetricItem[];
}

export const AnalyticsBrowserChart = ({ data }: AnalyticsBrowserChartProps) => {
	const t = useTranslations();
	const [expanded, setExpanded] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);
	const [showScrollHint, setShowScrollHint] = useState(false);
	const sorted = [...data].sort((a, b) => b.count - a.count);
	const total = data.reduce((sum, item) => sum + item.count, 0);
	const top4 = sorted.slice(0, 4);
	const rest = sorted.slice(4);
	const hasMore = rest.length > 0;

	useEffect(() => {
		const el = listRef.current;
		if (!el || !expanded) return;
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
	}, [expanded]);

	const handleToggle = useCallback(() => {
		if (expanded) {
			listRef.current?.scrollTo({ top: 0 });
		}
		setExpanded((prev) => !prev);
	}, [expanded]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">{t('chart.title.browserUsage')}</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<p className="text-muted-foreground text-sm">{t('analytics.noData')}</p>
				) : (
					<>
						<div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
							{top4.map((item, index) => {
								const share = total > 0 ? Math.round((item.count / total) * 100) : 0;
								return (
									<div key={`${item.label}-${index}`} className="rounded-lg bg-muted/50 p-4">
										<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
											{item.label}
										</p>
										<p className="text-2xl font-bold mt-1 tabular-nums">
											{share === 0 && item.count > 0 ? '<1' : share}%
										</p>
										<p className="text-xs text-muted-foreground tabular-nums mt-0.5">
											{item.count.toLocaleString()}
										</p>
									</div>
								);
							})}
						</div>

						{expanded && rest.length > 0 && (
							<div className="relative mt-4">
								<div
									ref={listRef}
									className="max-h-[250px] overflow-y-auto pr-1 space-y-4 scroll-smooth"
								>
									{rest.map((item, index) => {
										const rawShare = total > 0 ? (item.count / total) * 100 : 0;
										const share = Math.round(rawShare);
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
															width: `${Math.max(rawShare, item.count > 0 ? 1 : 0)}%`,
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
						)}

						{hasMore && (
							<Button
								variant="ghost"
								size="sm"
								className="w-full mt-3 text-muted-foreground"
								onClick={handleToggle}
							>
								{expanded ? t('general.showLess') : t('general.showMore')}
								<ChevronDownIcon
									className={`size-4 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
								/>
							</Button>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
};
