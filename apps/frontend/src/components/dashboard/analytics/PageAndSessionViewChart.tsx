"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import type { TPageviewsAndSessions } from "@shared/schemas";

export const description = "An interactive stacked bar chart";

const chartConfig = {
	pageviews: {
		label: "Page Views",
	},
	sessions: {
		label: "Sessions",
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
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-[250px] w-full"
		>
			<BarChart
				accessibilityLayer
				data={combinedData}
				margin={{ left: 12, right: 12 }}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="date"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={32}
					tickFormatter={(value: string) =>
						new Date(value).toLocaleDateString("DE-US", {
							month: "short",
							day: "numeric",
						})
					}
				/>
				<YAxis
					width={34}
					tickLine={false}
					axisLine={true}
					tickMargin={8}
					minTickGap={10}
					tickFormatter={(value: number) => value.toLocaleString()}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							className="w-[180px]"
							labelFormatter={(value: string) =>
								new Date(value).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									year: "numeric",
								})
							}
							formatter={(value: number, name: string) => {
								const label =
									chartConfig[name as keyof typeof chartConfig]?.label || name;
								return [value.toLocaleString(), label];
							}}
						/>
					}
				/>
				<Legend />
				<Bar dataKey="sessions" background={{ fill: "green" }} stackId="a" />
				<Bar dataKey="pageviews" background={{ fill: "red" }} stackId="a" />
			</BarChart>
		</ChartContainer>
	);
}
