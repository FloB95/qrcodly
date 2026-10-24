'use client';

import { useGetAnalyticsFromShortCodeQuery } from '@/lib/api/url-shortener';
import { useLocale, useTranslations } from 'next-intl';
import { getName } from 'i18n-iso-countries';
import { useMemo } from 'react';
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards';
import { AnalyticsDetails } from './AnalyticsDetails';
import { LockedAnalyticsDetails } from './LockedAnalyticsDetails';
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

export type AnalyticsVariant = 'scan' | 'click';

export const AnalyticsSection = ({
	shortCode,
	variant = 'scan',
}: {
	shortCode: string;
	variant?: AnalyticsVariant;
}) => {
	const locale = useLocale();
	const t = useTranslations();
	const { isLoading, data } = useGetAnalyticsFromShortCodeQuery(shortCode);

	const derived = useMemo(() => {
		if (!data) return null;

		const unknownLabel = t('analytics.unknownLabel');
		const withFallbackLabel = <T extends { label: string }>(item: T): T => ({
			...item,
			label: item.label.trim() === '' ? unknownLabel : item.label,
		});
		const countryName = (code: string) => getName(code.toLowerCase(), locale) ?? code;

		const { topCountry, topDevice } = data.summary;

		return {
			topCountry: topCountry
				? withFallbackLabel({ ...topCountry, label: countryName(topCountry.label) })
				: null,
			topDevice: topDevice ? withFallbackLabel(topDevice) : null,
			details: data.detailsLocked
				? null
				: {
						dailyData: aggregateHourlyToDaily(
							data.viewsAndSessions?.pageviews ?? [],
							data.viewsAndSessions?.sessions ?? [],
						),
						countryMetrics: (data.countryMetrics ?? []).map((item) =>
							withFallbackLabel({
								...item,
								code: item.label.toUpperCase(),
								label: countryName(item.label),
							}),
						),
						deviceMetrics: (data.deviceMetrics ?? []).map(withFallbackLabel),
						browserMetrics: (data.browserMetrics ?? []).map(withFallbackLabel),
						osMetrics: (data.osMetrics ?? []).map(withFallbackLabel),
					},
		};
	}, [data, locale, t]);

	if (isLoading || !data || !derived) {
		return <AnalyticsSectionSkeleton />;
	}

	return (
		<>
			<AnalyticsSummaryCards
				totalScans={data.shortUrlStats.pageviews}
				totalVisitors={data.shortUrlStats.visitors}
				scansLast7Days={data.summary.pageviewsLast7Days}
				visitorsLast7Days={data.summary.visitorsLast7Days}
				topCountry={derived.topCountry}
				topDevice={derived.topDevice}
				variant={variant}
			/>

			{derived.details ? (
				<AnalyticsDetails data={derived.details} locale={locale} variant={variant} />
			) : (
				<LockedAnalyticsDetails locale={locale} variant={variant} />
			)}
		</>
	);
};
