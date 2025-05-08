'use client';

import { Bar, BarChart, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import type { TPageviewsAndSessions } from '@shared/schemas';

const chartConfig = {
	pageviews: {
		label: 'Page Views',
		color: 'var(--chart-1)',
	},
	sessions: {
		label: 'Sessions',
		color: 'var(--chart-2)',
	},
} satisfies ChartConfig;

type StatisticChartProps = {
	chartData: TPageviewsAndSessions;
};

export function PageAndSessionViewChart({ chartData }: StatisticChartProps) {
	const combinedData = chartData?.pageviews.map((pv, index) => ({
		date: pv.date,
		pageviews: pv.value,
		sessions: chartData.sessions[index]?.value ?? 0,
	}));

	return (
		<Card>
			<CardHeader>
				<CardDescription>Total Views</CardDescription>
				<CardTitle className="flex space-x-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					<span>{1200}</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<BarChart accessibilityLayer data={combinedData}>
						<XAxis
							dataKey="date"
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={(value) =>
								new Date(value as string | number).toLocaleDateString('en-US', {
									weekday: 'short',
								})
							}
						/>
						<Bar
							dataKey="sessions"
							stackId="a"
							fill="var(--color-sessions)"
							radius={[0, 0, 4, 4]}
						/>
						<Bar
							dataKey="pageviews"
							stackId="a"
							fill="var(--color-pageviews)"
							radius={[4, 4, 0, 0]}
						/>
						<ChartTooltip content={<ChartTooltipContent />} cursor={false} defaultIndex={1} />
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
