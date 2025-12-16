'use client';

import { useGetAnalyticsFromShortCodeQuery } from '@/lib/api/url-shortener';
import { BarChartCardSkeleton } from './BarChartCard';
import type { ChartConfig } from '@/components/ui/chart';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid';
import { getName } from 'i18n-iso-countries';
import { AnalyticsCard } from './AnalyticsCard';

export const AnalyticsSection = ({ shortCode }: { shortCode: string }) => {
	const locale = useLocale();
	const t = useTranslations();
	const buildChartData = (metrics: { label: string; count: number }[], title: string) => {
		const total = metrics.reduce((sum, item) => sum + item.count, 0);
		const data = metrics.map((item) => ({
			label: item.label,
			data: item.count,
			percentage: total > 0 ? ((item.count / total) * 100).toFixed(0) + '%' : '0%',
		}));

		const config: ChartConfig = {
			data: { label: t('chart.visitors') },
			...Object.fromEntries(metrics.map((item) => [item.label, { label: item.label }])),
		};

		return { data, config, title };
	};
	const { isLoading, data } = useGetAnalyticsFromShortCodeQuery(shortCode);

	if (isLoading || !data) {
		return (
			<div className="grid flex-1 scroll-mt-20 items-start gap-5 md:grid-cols-2 lg:grid-cols-3 pb-3">
				<BarChartCardSkeleton />
				<BarChartCardSkeleton />
				<BarChartCardSkeleton />
			</div>
		);
	}

	const browserChart = buildChartData(data.browserMetrics ?? [], t('chart.title.browserUsage'));
	const deviceChart = buildChartData(data.deviceMetrics ?? [], t('chart.title.deviceUsage'));
	const countryChart = buildChartData(
		data.countryMetrics ?? [],
		t('chart.title.countryDistribution'),
	);

	const osChart = buildChartData(data.osMetrics ?? [], t('chart.title.osUsage'));

	const viewsInLastWeek = data.viewsAndSessions.pageviews
		.filter((item) => {
			const oneWeekAgo = new Date();
			oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
			return new Date(item.date) >= oneWeekAgo;
		})
		.reduce((acc, item) => acc + item.value, 0);

	const sessionsInLastWeek = data.viewsAndSessions.sessions
		.filter((item) => {
			const oneWeekAgo = new Date();
			oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
			return new Date(item.date) >= oneWeekAgo;
		})
		.reduce((acc, item) => acc + item.value, 0);

	return (
		<>
			<div className="xs:flex mb-4 gap-5 items-center">
				<Card className="h-full mb-4 xs:mb-0">
					<CardHeader className="relative">
						<CardDescription>{t('analytics.totalViews')}</CardDescription>
						<CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
							{data.shortUrlStats.pageviews}
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1 text-sm">
						<div className="line-clamp-1 flex gap-2 font-medium text-muted-foreground items-center">
							<div
								dangerouslySetInnerHTML={{
									__html: String(
										t('analytics.viewsInLastXDays', {
											count: `<span class="font-bold text-black">${viewsInLastWeek}</span>`,
											days: `<span class="font-bold text-black">7 ${t('general.days')}</span>`,
										}),
									),
								}}
							/>
							{viewsInLastWeek > 0 ? (
								<ArrowTrendingUpIcon className="size-5" />
							) : (
								<ArrowTrendingDownIcon className="size-5" />
							)}
						</div>
					</CardFooter>
				</Card>
				<Card className="h-full">
					<CardHeader className="relative">
						<CardDescription>{t('analytics.totalVisitors')}</CardDescription>
						<CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
							{data.shortUrlStats.visitors}
						</CardTitle>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1 text-sm">
						<div className="line-clamp-1 flex gap-2 font-medium text-muted-foreground items-center">
							<div
								dangerouslySetInnerHTML={{
									__html: String(
										t('analytics.visitorsInLastXDays', {
											count: `<span class="font-bold text-black">${sessionsInLastWeek}</span>`,
											days: `<span class="font-bold text-black">7 ${t('general.days')}</span>`,
										}),
									),
								}}
							/>
							{sessionsInLastWeek > 0 ? (
								<ArrowTrendingUpIcon className="size-5" />
							) : (
								<ArrowTrendingDownIcon className="size-5" />
							)}
						</div>
					</CardFooter>
				</Card>
			</div>

			<div className="md:grid space-y-4 md:space-y-0 flex-1 scroll-mt-20 items-start gap-5 md:grid-cols-2 pb-4">
				<AnalyticsCard data={browserChart.data} title={browserChart.title} />
				<AnalyticsCard data={deviceChart.data} title={deviceChart.title} />
				<AnalyticsCard
					data={countryChart.data.map((data) => {
						return {
							...data,
							label: getName(data.label.toLowerCase(), locale) ?? data.label,
						};
					})}
					title={countryChart.title}
				/>
				<AnalyticsCard data={osChart.data} title={osChart.title} />
			</div>
		</>
	);
};
