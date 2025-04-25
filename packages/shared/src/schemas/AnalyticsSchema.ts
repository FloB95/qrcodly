import { z } from 'zod';

const TimeSeriesPointSchema = z.object({
	date: z.string(),
	value: z.number(),
});

const TimeSeriesSchema = z.array(TimeSeriesPointSchema);
export type TTimeSeries = z.infer<typeof TimeSeriesPointSchema>;

const PageviewsAndSessionsSchema = z.object({
	pageviews: TimeSeriesSchema,
	sessions: TimeSeriesSchema,
});
export type TPageviewsAndSessions = z.infer<typeof PageviewsAndSessionsSchema>;

const MetricSchema = z.object({
	label: z.string(),
	count: z.number(),
});
export type TAnalyticsMetric = z.infer<typeof MetricSchema>;

const ShortUrlStatsSchema = z.object({
	pageviews: z.object({
		value: z.number(),
	}),
	visitors: z.object({
		value: z.number(),
	}),
	visits: z.object({
		value: z.number(),
	}),
	bounces: z.object({
		value: z.number(),
	}),
	totaltime: z.object({
		value: z.number(),
	}),
});
export type TShortUrlStats = z.infer<typeof ShortUrlStatsSchema>;

export const AnalyticsSchema = z.object({
	shortUrlStats: ShortUrlStatsSchema,
	viewsAndSessions: PageviewsAndSessionsSchema,
	browserMetrics: z.array(MetricSchema),
	osMetrics: z.array(MetricSchema),
	deviceMetrics: z.array(MetricSchema),
	countryMetrics: z.array(MetricSchema),
});

export type Analytics = z.infer<typeof AnalyticsSchema>;
