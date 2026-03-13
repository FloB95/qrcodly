'use client';

import { motion } from 'framer-motion';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface MetricItem {
	label: string;
	count: number;
}

interface AnalyticsCountryChartProps {
	data: MetricItem[];
}

export const AnalyticsCountryChart = ({ data }: AnalyticsCountryChartProps) => {
	const t = useTranslations();
	const sorted = [...data].sort((a, b) => b.count - a.count);
	const top10 = sorted.slice(0, 10);
	const total = data.reduce((sum, item) => sum + item.count, 0);
	const maxCount = top10[0]?.count ?? 0;

	return (
		<Card className="h-full">
			<CardHeader>
				<div className="flex items-center gap-2">
					<div className="p-2 rounded-lg bg-primary/10 text-primary">
						<MapPinIcon className="size-4" />
					</div>
					<CardTitle className="text-lg">{t('chart.title.countryDistribution')}</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<p className="text-muted-foreground text-sm">{t('analytics.noData')}</p>
				) : (
					<div className="space-y-3">
						{top10.map((item, index) => {
							const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
							const share = total > 0 ? Math.round((item.count / total) * 100) : 0;
							return (
								<motion.div
									key={item.label}
									initial={{ opacity: 0, x: -15 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.05, duration: 0.3 }}
								>
									<div className="flex items-center justify-between mb-1">
										<span className="text-sm font-medium truncate mr-2">{item.label}</span>
										<span className="text-sm text-muted-foreground tabular-nums shrink-0">
											{item.count} · {share}%
										</span>
									</div>
									<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
										<motion.div
											className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500"
											initial={{ width: 0 }}
											animate={{ width: `${percentage}%` }}
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
				)}
			</CardContent>
		</Card>
	);
};
