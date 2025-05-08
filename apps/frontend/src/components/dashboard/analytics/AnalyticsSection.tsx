'use client';

import { useGetAnalyticsFromShortCodeQuery } from '@/lib/api/url-shortener';
import { BarChartCard, BarChartCardSkeleton } from './BarChartCard';
import type { ChartConfig } from '@/components/ui/chart';
import { useTranslations } from 'next-intl';

export const AnalyticsSection = ({ shortCode }: { shortCode: string }) => {
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
			<div className="grid flex-1 scroll-mt-20 items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
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

	return (
		<div className="grid flex-1 scroll-mt-20 items-start gap-5 md:grid-cols-2 lg:grid-cols-3 pb-4">
			{browserChart.data.length > 0 && (
				<BarChartCard
					data={browserChart.data}
					config={browserChart.config}
					title={browserChart.title}
				/>
			)}
			{deviceChart.data.length > 0 && (
				<BarChartCard
					data={deviceChart.data}
					config={deviceChart.config}
					title={deviceChart.title}
				/>
			)}
			{countryChart.data.length > 0 && (
				<BarChartCard
					data={countryChart.data}
					config={countryChart.config}
					title={countryChart.title}
				/>
			)}
		</div>
	);
};
