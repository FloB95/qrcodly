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

export const AnalyticsSchema = z.object({
	shortUrlStats: ShortUrlStatsSchema.describe('Aggregate statistics for the short URL'),
	viewsAndSessions: PageviewsAndSessionsSchema.describe(
		'Time-series data for pageviews and sessions',
	),
	browserMetrics: z
		.array(MetricSchema)
		.describe('Click breakdown by browser (e.g. Chrome, Firefox, Safari)'),
	osMetrics: z
		.array(MetricSchema)
		.describe('Click breakdown by operating system (e.g. Windows, macOS, Android)'),
	deviceMetrics: z
		.array(MetricSchema)
		.describe('Click breakdown by device type (e.g. desktop, mobile, tablet)'),
	countryMetrics: z.array(MetricSchema).describe('Click breakdown by country'),
});

export type Analytics = z.infer<typeof AnalyticsSchema>;
