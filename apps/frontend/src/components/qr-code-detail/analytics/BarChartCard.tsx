'use client';

import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

interface BarChartCardProps {
	data: Array<Record<string, string | number>>;
	config: ChartConfig;
	title: string;
}

export function BarChartCard({ data, config, title }: BarChartCardProps) {
	const t = useTranslations();
	return (
		<Card className="gap-0">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<div className="flex h-full w-full items-center justify-center py-12">
						<p className="text-sm text-muted-foreground">{t('analytics.noData')}</p>
					</div>
				) : (
					<ChartContainer config={config}>
						<BarChart
							accessibilityLayer
							data={data}
							layout="vertical"
							margin={{
								right: -100,
							}}
						>
							<YAxis
								// width={100}
								dataKey="label"
								type="category"
								tickLine={false}
								tickMargin={5}
								axisLine={false}
								hide
							/>
							<XAxis dataKey="data" type="number" hide />
							<ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
							<Bar
								dataKey="data"
								layout="vertical"
								fill="var(--chart-1)"
								radius={4}
								maxBarSize={30}
							>
								<LabelList
									dataKey="label"
									position="insideLeft"
									offset={8}
									className="fill-white"
									fontSize={12}
								/>
								<LabelList
									dataKey="data"
									position="insideRight"
									offset={12}
									className="fill-white"
									fontSize={12}
								/>
								<LabelList
									dataKey="percentage"
									position="right"
									offset={12}
									className="fill-black"
									fontSize={12}
								/>
							</Bar>
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

export function BarChartCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Skeleton className="h-6 w-40" />
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{Array.from({ length: 4 }).map((_, idx) => (
						<div key={idx} className="flex items-center space-x-4">
							<Skeleton className="h-7 w-full" /> {/* label */}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
