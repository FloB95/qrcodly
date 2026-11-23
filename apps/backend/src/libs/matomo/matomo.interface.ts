/** Custom variables by slot, sent as `_cvar`, e.g. `{ '1': ['Device Type', 'desktop'] }` */
export type TMatomoCustomVariables = Record<string, [name: string, value: string]>;

/**
 * Matomo only accepts the client IP override (`cip`) together with `token_auth`; Matomo Cloud
 * answers 400 otherwise
 */
export interface IMatomoTrackingAuth {
	token: string;
	clientIp: string;
}

/** One page view for the Tracking API */
export interface IMatomoTrackRequest {
	siteId: string;
	actionName: string;
	url: string;
	referrer: string;
	language: string;
	customVariables: TMatomoCustomVariables;
	auth?: IMatomoTrackingAuth;
}

/**
 * accepted: Matomo accepted the site; a token counts as confirmed only when the Reporting API
 * answered, not on the tracking-endpoint fallback taken when that call fails;
 * rejected: Matomo answered but refused the site or the token;
 * unreachable: Matomo did not answer
 */
export type TMatomoSiteCheck = 'accepted' | 'rejected' | 'unreachable';
