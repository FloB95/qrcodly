'use client';

import { AnalyticsTimeChart } from './AnalyticsTimeChart';
import { AnalyticsDeviceChart } from './AnalyticsDeviceChart';
import { AnalyticsBrowserChart } from './AnalyticsBrowserChart';
import { AnalyticsCountryChart } from './AnalyticsCountryChart';
import { AnalyticsOsChart } from './AnalyticsOsChart';
import type { AnalyticsVariant } from './AnalyticsSection';

type MetricItem = { label: string; count: number };

export interface AnalyticsDetailsData {
	dailyData: { date: string; scans: number; visitors: number }[];
	countryMetrics: (MetricItem & { code: string })[];
	deviceMetrics: MetricItem[];
	browserMetrics: MetricItem[];
	osMetrics: MetricItem[];
}

export const AnalyticsDetails = ({
	data,
	locale,
	variant,
}: {
	data: AnalyticsDetailsData;
	locale: string;
	variant: AnalyticsVariant;
}) => (
	<>
		<AnalyticsTimeChart data={data.dailyData} locale={locale} variant={variant} />

		<div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-5 py-4">
			<AnalyticsCountryChart data={data.countryMetrics} />
			<div className="flex flex-col gap-5">
				<AnalyticsDeviceChart data={data.deviceMetrics} />
				<AnalyticsBrowserChart data={data.browserMetrics} />
			</div>
		</div>

		<div className="pb-4">
			<AnalyticsOsChart data={data.osMetrics} />
		</div>
	</>
);
