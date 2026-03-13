'use client';

import { useGetAnalyticsFromShortCodeQuery } from '@/lib/api/url-shortener';
import { useLocale } from 'next-intl';
import { getName } from 'i18n-iso-countries';
import { useMemo } from 'react';
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards';
import { AnalyticsTimeChart } from './AnalyticsTimeChart';
import { AnalyticsDeviceChart } from './AnalyticsDeviceChart';
import { AnalyticsBrowserChart } from './AnalyticsBrowserChart';
import { AnalyticsCountryChart } from './AnalyticsCountryChart';
import { AnalyticsOsChart } from './AnalyticsOsChart';
import { AnalyticsSectionSkeleton } from './AnalyticsSectionSkeleton';

function aggregateHourlyToDaily(
	pageviews: { date: string; value: number }[],
	sessions: { date: string; value: number }[],
) {
	const dailyMap = new Map<string, { scans: number; visitors: number }>();

	for (const point of pageviews) {
		const day = point.date.slice(0, 10);
		const existing = dailyMap.get(day) ?? { scans: 0, visitors: 0 };
		existing.scans += point.value;
		dailyMap.set(day, existing);
	}

	for (const point of sessions) {
		const day = point.date.slice(0, 10);
		const existing = dailyMap.get(day) ?? { scans: 0, visitors: 0 };
		existing.visitors += point.value;
		dailyMap.set(day, existing);
	}

	return Array.from(dailyMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, values]) => ({
			date,
			scans: values.scans,
			visitors: values.visitors,
		}));
}

function getLast7DaysSum(series: { date: string; value: number }[]) {
	const oneWeekAgo = new Date();
	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
	return series
		.filter((item) => new Date(item.date) >= oneWeekAgo)
		.reduce((acc, item) => acc + item.value, 0);
}

export const AnalyticsSection = ({ shortCode }: { shortCode: string }) => {
	const locale = useLocale();
	const { isLoading, data } = useGetAnalyticsFromShortCodeQuery(shortCode);

	const derived = useMemo(() => {
		if (!data) return null;

		const { viewsAndSessions, browserMetrics, deviceMetrics, countryMetrics, osMetrics } = data;

		const dailyData = aggregateHourlyToDaily(viewsAndSessions.pageviews, viewsAndSessions.sessions);

		const scansLast7Days = getLast7DaysSum(viewsAndSessions.pageviews);
		const visitorsLast7Days = getLast7DaysSum(viewsAndSessions.sessions);

		const resolvedCountryMetrics = (countryMetrics ?? []).map((item) => ({
			...item,
			label: getName(item.label.toLowerCase(), locale) ?? item.label,
		}));

		return {
			dailyData,
			scansLast7Days,
			visitorsLast7Days,
			browserMetrics: browserMetrics ?? [],
			deviceMetrics: deviceMetrics ?? [],
			countryMetrics: resolvedCountryMetrics,
			osMetrics: osMetrics ?? [],
		};
	}, [data, locale]);

	if (isLoading || !data || !derived) {
		return <AnalyticsSectionSkeleton />;
	}

	return (
		<>
			<AnalyticsSummaryCards
				totalScans={data.shortUrlStats.pageviews}
				totalVisitors={data.shortUrlStats.visitors}
				scansLast7Days={derived.scansLast7Days}
				visitorsLast7Days={derived.visitorsLast7Days}
			/>

			<AnalyticsTimeChart data={derived.dailyData} locale={locale} />

			<div className="md:grid space-y-4 md:space-y-0 flex-1 scroll-mt-20 items-start gap-5 md:grid-cols-2 py-4">
				<AnalyticsDeviceChart data={derived.deviceMetrics} />
				<AnalyticsBrowserChart data={derived.browserMetrics} />
				<AnalyticsCountryChart data={derived.countryMetrics} />
				<AnalyticsOsChart data={derived.osMetrics} />
			</div>
		</>
	);
};
