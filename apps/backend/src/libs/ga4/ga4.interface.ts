/** Addresses one GA4 web data stream */
export interface IGa4Credentials {
	measurementId: string;
	apiSecret: string;
}

export interface IGa4Event {
	name: string;
	params: Record<string, unknown>;
}

/** Request body of the collect and the debug endpoint */
export interface IGa4Payload {
	client_id: string;
	ip_override?: string;
	events: IGa4Event[];
}

export interface IGa4ValidationMessage {
	fieldPath: string;
	description: string;
	validationCode: string;
}

/** Answer of the debug endpoint */
export interface IGa4DebugResponse {
	validationMessages?: IGa4ValidationMessage[];
}

export type TGa4Endpoint = 'collect' | 'debug';
