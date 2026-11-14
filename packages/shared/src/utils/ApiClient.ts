/**
 * Every client that talks to the QRcodly API. First-party clients identify themselves with the
 * `X-QRcodly-Client: <client>/<version>` header; `api` covers direct API usage with an API key.
 * A new integration only needs an entry here and has to send the header.
 */
export const API_CLIENTS = [
	'web',
	'desktop',
	'browser-extension',
	'figma',
	'indesign',
	'mcp-server',
	'api',
] as const;

export type TApiClient = (typeof API_CLIENTS)[number];

export const API_CLIENT_HEADER = 'X-QRcodly-Client';

const API_CLIENT_VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/;

export type TApiClientInfo = {
	client: TApiClient;
	version: string | null;
};

export function isApiClient(value: string): value is TApiClient {
	return (API_CLIENTS as readonly string[]).includes(value);
}

export function formatApiClientHeader(client: TApiClient, version?: string | null): string {
	return version ? `${client}/${version}` : client;
}

export function parseApiClientHeader(value: string | null | undefined): TApiClientInfo | null {
	if (!value) return null;

	const [name = '', version] = value.trim().split('/', 2);
	const client = name.toLowerCase();
	if (!isApiClient(client)) return null;

	return {
		client,
		version: version && API_CLIENT_VERSION_PATTERN.test(version) ? version : null,
	};
}
