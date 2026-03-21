'use client';

import { PieChart, Pie, Cell, Sector } from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { useTranslations } from 'next-intl';
import { useState, useCallback } from 'react';

interface MetricItem {
	label: string;
	count: number;
}

interface AnalyticsDeviceChartProps {
	data: MetricItem[];
	variant?: 'scan' | 'click';
}

const COLORS = [
	'var(--chart-1)',
	'var(--chart-2)',
	'var(--chart-3)',
	'var(--chart-4)',
	'var(--chart-5)',
];

export const AnalyticsDeviceChart = ({ data }: AnalyticsDeviceChartProps) => {
	const t = useTranslations();
	const sorted = [...data].sort((a, b) => b.count - a.count);
	const total = data.reduce((sum, item) => sum + item.count, 0);
	const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

	const activeShare =
		activeIndex !== undefined && sorted[activeIndex]
			? Math.round((sorted[activeIndex].count / total) * 100)
			: sorted[0] && total > 0
				? Math.round((sorted[0].count / total) * 100)
				: 0;

	const onPieEnter = useCallback((_: unknown, index: number) => {
		setActiveIndex(index);
	}, []);

	const onPieLeave = useCallback(() => {
		setActiveIndex(undefined);
	}, []);

	const chartConfig = sorted.reduce(
		(acc, item, index) => {
			acc[item.label] = {
				label: item.label,
				color: COLORS[index % COLORS.length] ?? COLORS[0]!,
			};
			return acc;
		},
		{} as Record<string, { label: string; color: string }>,
	) satisfies ChartConfig;

	const pieData = sorted.map((item) => ({
		name: item.label,
		value: item.count,
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">{t('chart.title.deviceUsage')}</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<p className="text-muted-foreground text-sm">{t('analytics.noData')}</p>
				) : (
					<div className="flex flex-col items-center">
						<div className="relative">
							<ChartContainer config={chartConfig} className="h-[160px] w-[160px]">
								<PieChart>
									<Pie
										data={pieData}
										innerRadius={50}
										outerRadius={72}
										paddingAngle={2}
										dataKey="value"
										nameKey="name"
										strokeWidth={0}
										activeIndex={activeIndex}
										activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
											<Sector {...props} outerRadius={outerRadius + 5} />
										)}
										onMouseEnter={onPieEnter}
										onMouseLeave={onPieLeave}
									>
										{pieData.map((_, index) => (
											<Cell
												key={index}
												fill={COLORS[index % COLORS.length]}
												className="cursor-pointer"
											/>
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
								<span className="text-2xl font-bold tabular-nums">{activeShare}%</span>
							</div>
						</div>

						<div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4 w-full">
							{sorted.map((item, index) => {
								const share = total > 0 ? Math.round((item.count / total) * 100) : 0;
								const isActive = activeIndex === index;
								return (
									<div
										key={`${item.label}-${index}`}
										className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-all cursor-pointer ${
											isActive
												? 'bg-muted/80'
												: activeIndex !== undefined
													? 'opacity-40'
													: 'hover:bg-muted/50'
										}`}
										onMouseEnter={() => setActiveIndex(index)}
										onMouseLeave={() => setActiveIndex(undefined)}
									>
										<div
											className="size-2.5 rounded-full shrink-0"
											style={{
												backgroundColor: COLORS[index % COLORS.length],
											}}
										/>
										<div className="min-w-0">
											<p className="text-sm font-medium">{item.label}</p>
											<p className="text-xs text-muted-foreground tabular-nums">
												{item.count.toLocaleString()} ·{' '}
												{share === 0 && item.count > 0 ? '<1' : share}%
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
