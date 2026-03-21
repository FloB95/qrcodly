'use client';

import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface TimeChartDataPoint {
	date: string;
	scans: number;
	visitors: number;
}

interface AnalyticsTimeChartProps {
	data: TimeChartDataPoint[];
	locale: string;
	variant?: 'scan' | 'click';
}

const chartConfig = {
	scans: {
		label: 'Scans',
		color: 'var(--chart-1)',
	},
	visitors: {
		label: 'Visitors',
		color: 'var(--chart-2)',
	},
} satisfies ChartConfig;

export const AnalyticsTimeChart = ({ data, locale, variant = 'scan' }: AnalyticsTimeChartProps) => {
	const id = useId();
	const fillScansId = `fillScans-${id.replace(/:/g, '')}`;
	const fillVisitorsId = `fillVisitors-${id.replace(/:/g, '')}`;
	const t = useTranslations();

	const unitLabel = variant === 'scan' ? t('analytics.scansUnit') : t('analytics.clicksUnit');

	const configWithLabels = {
		scans: {
			...chartConfig.scans,
			label: unitLabel,
		},
		visitors: {
			...chartConfig.visitors,
			label: t('analytics.visitorsUnit'),
		},
	} satisfies ChartConfig;

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t('chart.title.activityOverTime')}</CardTitle>
				<CardDescription>{t('chart.title.activityOverTimeDescription')}</CardDescription>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm">
						{t('analytics.noData')}
					</div>
				) : (
					<ChartContainer
						config={configWithLabels}
						className="h-[250px] sm:h-[300px] w-full aspect-auto"
					>
						<AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
							<defs>
								<linearGradient id={fillScansId} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="var(--color-scans)" stopOpacity={0.3} />
									<stop offset="100%" stopColor="var(--color-scans)" stopOpacity={0.05} />
								</linearGradient>
								<linearGradient id={fillVisitorsId} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="var(--color-visitors)" stopOpacity={0.3} />
									<stop offset="100%" stopColor="var(--color-visitors)" stopOpacity={0.05} />
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={formatDate}
							/>
							<ChartTooltip content={<ChartTooltipContent labelFormatter={formatDate} />} />
							<ChartLegend content={<ChartLegendContent />} />
							<Area
								dataKey="scans"
								type="monotone"
								fill={`url(#${fillScansId})`}
								stroke="var(--color-scans)"
								strokeWidth={2}
							/>
							<Area
								dataKey="visitors"
								type="monotone"
								fill={`url(#${fillVisitorsId})`}
								stroke="var(--color-visitors)"
								strokeWidth={2}
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
};
