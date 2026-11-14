import { z } from 'zod';

const TimeSeriesPointSchema = z.object({
	date: z.string().describe('Date label for this data point (e.g. "2025-06-15")'),
	value: z.number().describe('Numeric value for this data point'),
});

const TimeSeriesSchema = z.array(TimeSeriesPointSchema);
export type TTimeSeries = z.infer<typeof TimeSeriesPointSchema>;

const PageviewsAndSessionsSchema = z.object({
	pageviews: TimeSeriesSchema.describe('Time-series of daily pageview counts'),
	sessions: TimeSeriesSchema.describe('Time-series of daily session counts'),
});
export type TPageviewsAndSessions = z.infer<typeof PageviewsAndSessionsSchema>;

const MetricSchema = z.object({
	label: z.string().describe('Metric category label (e.g. browser name, country code)'),
	count: z.number().describe('Number of occurrences for this category'),
});
export type TAnalyticsMetric = z.infer<typeof MetricSchema>;

const ShortUrlStatsSchema = z.object({
	pageviews: z.number().describe('Total number of pageviews'),
	visitors: z.number().describe('Total number of unique visitors'),
	visits: z.number().describe('Total number of visits (sessions)'),
	bounces: z.number().describe('Total number of bounce visits (single-page sessions)'),
	totaltime: z.number().describe('Total time spent across all visits in seconds'),
});
export type TShortUrlStats = z.infer<typeof ShortUrlStatsSchema>;

const TopEntrySchema = z.object({
	label: z
		.string()
		.describe('Category label (country code for countries, device type for devices)'),
	share: z.number().describe('Share of all tracked traffic in percent, rounded to a whole number'),
});
export type TAnalyticsTopEntry = z.infer<typeof TopEntrySchema>;

const AnalyticsSummarySchema = z.object({
	pageviewsLast7Days: z.number().describe('Pageviews over the last 7 days'),
	visitorsLast7Days: z
		.number()
		.describe('Visitors over the last 7 days, summed from the hourly session counts'),
	topCountry: TopEntrySchema.nullable().describe('Country with the most traffic, if any'),
	topDevice: TopEntrySchema.nullable().describe('Device type with the most traffic, if any'),
});
export type TAnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;

export const AnalyticsSchema = z.object({
	shortUrlStats: ShortUrlStatsSchema.describe('Aggregate statistics for the short URL'),
	summary: AnalyticsSummarySchema.describe('Headline figures, available on every plan'),
	detailsLocked: z
		.boolean()
		.describe(
			'True when the detailed breakdowns below require the Pro plan; they are null in that case',
		),
	viewsAndSessions: PageviewsAndSessionsSchema.nullable().describe(
		'Time-series data for pageviews and sessions (Pro only)',
	),
	browserMetrics: z
		.array(MetricSchema)
		.nullable()
		.describe('Click breakdown by browser, e.g. Chrome, Firefox, Safari (Pro only)'),
	osMetrics: z
		.array(MetricSchema)
		.nullable()
		.describe('Click breakdown by operating system, e.g. Windows, macOS, Android (Pro only)'),
	deviceMetrics: z
		.array(MetricSchema)
		.nullable()
		.describe('Click breakdown by device type, e.g. desktop, mobile, tablet (Pro only)'),
	countryMetrics: z
		.array(MetricSchema)
		.nullable()
		.describe('Click breakdown by country (Pro only)'),
});

export type Analytics = z.infer<typeof AnalyticsSchema>;
