"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "An interactive bar chart";

const chartData = [
  { date: "2024-04-01", views: 222 },
  { date: "2024-04-02", views: 97 },
  { date: "2024-04-03", views: 167 },
  { date: "2024-04-04", views: 242 },
  { date: "2024-04-05", views: 373 },
  { date: "2024-04-06", views: 301 },
  { date: "2024-04-07", views: 245 },
  { date: "2024-04-08", views: 409 },
  { date: "2024-04-09", views: 59 },
  { date: "2024-04-10", views: 261 },
  { date: "2024-04-11", views: 327 },
  { date: "2024-04-12", views: 292 },
  { date: "2024-04-13", views: 342 },
  { date: "2024-04-14", views: 137 },
  { date: "2024-04-15", views: 120 },
  { date: "2024-04-16", views: 138 },
  { date: "2024-04-17", views: 446 },
  { date: "2024-04-18", views: 364 },
  { date: "2024-04-19", views: 243 },
  { date: "2024-04-20", views: 89 },
  { date: "2024-04-21", views: 137 },
  { date: "2024-04-22", views: 224 },
  { date: "2024-04-23", views: 138 },
  { date: "2024-04-24", views: 387 },
  { date: "2024-04-25", views: 215 },
  { date: "2024-04-26", views: 75 },
  { date: "2024-04-27", views: 383 },
  { date: "2024-04-28", views: 122 },
  { date: "2024-04-29", views: 315 },
  { date: "2024-04-30", views: 454 },
  { date: "2024-05-01", views: 165 },
  { date: "2024-05-02", views: 293 },
  { date: "2024-05-03", views: 247 },
  { date: "2024-05-04", views: 385 },
  { date: "2024-05-05", views: 481 },
  { date: "2024-05-06", views: 498 },
  { date: "2024-05-07", views: 388 },
  { date: "2024-05-08", views: 149 },
  { date: "2024-05-09", views: 227 },
  { date: "2024-05-10", views: 293 },
  { date: "2024-05-11", views: 335 },
  { date: "2024-05-12", views: 197 },
  { date: "2024-05-13", views: 197 },
  { date: "2024-05-14", views: 448 },
  { date: "2024-05-15", views: 1473 },
  { date: "2024-05-16", views: 338 },
  { date: "2024-05-17", views: 499 },
  { date: "2024-05-18", views: 315 },
  { date: "2024-05-19", views: 235 },
  { date: "2024-05-20", views: 177 },
  { date: "2024-05-21", views: 82 },
  { date: "2024-05-22", views: 81 },
];

const chartConfig = {
  views: {
    label: "Page Views",
  },
} satisfies ChartConfig;

export function StatisticChart() {
  const total = React.useMemo(
    () => ({
      views: chartData.reduce((acc, curr) => acc + curr.views, 0),
    }),
    [],
  );
  const totalString = total.views.toLocaleString();

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>www.medium.ag</CardTitle>
          <CardDescription>
            Showing total scans for the last 30 days
          </CardDescription>
        </div>
        <div className="flex">
          <button className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
            <span className="text-xs text-muted-foreground">Total Views</span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {totalString}
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("DE-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              width={34}
              dataKey={"views"}
              tickLine={false}
              axisLine={true}
              tickMargin={8}
              minTickGap={10}
              tickFormatter={(value: number) => {
                return value.toLocaleString();
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value: string) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Bar dataKey="views" fill={`var(--color-hsl(var(--chart-1)))`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
