export interface IScanEventData {
	url: string;
	userAgent: string;
	hostname: string;
	language: string;
	referrer: string;
	ip: string;
	deviceType: string;
	browserName: string;
}

export interface IAnalyticsProvider {
	sendEvent(event: IScanEventData, credentials: Record<string, unknown>): Promise<void>;
	validateCredentials(credentials: Record<string, unknown>): Promise<boolean>;
}
