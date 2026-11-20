/** What Umami did with a sent event; `discarded` is an empty 200, i.e. its bot filter dropped it */
export type TUmamiSendOutcome = 'accepted' | 'discarded' | 'rejected' | 'error';

/** The `payload` of an event for POST /api/send; the client adds the website id */
export interface IUmamiEventPayload {
	url: string;
	hostname: string;
	language: string;
	referrer: string;
	/** Also sent as the User-Agent header */
	userAgent: string;
	/** Umami 3 reads it with `??`, so '' blanks the dimension instead of falling back */
	device?: string;
	/** Also sent as the X-Client-Real-IP header, which Umami geolocates */
	ip: string;
}

/** The units this app asks Umami for */
export type TUmamiTimeUnit = 'hour' | 'day';

/** The metric breakdowns this app asks Umami for */
export type TUmamiMetricType = 'browser' | 'os' | 'device' | 'country';

/** Query of the website endpoints; sent in the given key order */
export interface IUmamiWebsiteQuery {
	/** Epoch milliseconds */
	startAt: number;
	/** Epoch milliseconds */
	endAt: number;
	unit: TUmamiTimeUnit;
	path: string;
	timezone: string;
}

export interface IUmamiMetricsQuery extends IUmamiWebsiteQuery {
	type: TUmamiMetricType;
}

/** GET /api/websites/:id/stats */
export interface IUmamiWebsiteStats {
	pageviews: number;
	visitors: number;
	visits: number;
	bounces: number;
	totaltime: number;
}

/** One bucket of a time series or one row of a metric breakdown */
export interface IUmamiDataPoint {
	x: string;
	y: number;
}

/** GET /api/websites/:id/pageviews */
export interface IUmamiPageviews {
	pageviews: IUmamiDataPoint[];
	sessions: IUmamiDataPoint[];
}

/** POST /api/auth/login */
export interface IUmamiLoginResponse {
	token: string;
}
