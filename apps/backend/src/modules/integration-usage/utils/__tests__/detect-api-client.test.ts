import { parseApiClientHeader } from '@shared/schemas';
import { detectApiClient } from '../detect-api-client';

const FIGMA_DESKTOP_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Figma/126.10.11 Chrome/150.0.7871.250 Electron/43.8.1';
const INDESIGN_UA =
	'Adobe UXP Runtime/uxp-9.3.0-local (win32 10.0.26200; x64) InDesign/21.6.0 7b62450e/0.2.0';
const CHROME_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';
const DESKTOP_APP_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) QRcodly/1.0.0 Chrome/138.0.0.0 Electron/37.2.0 Safari/537.36';
const EXTENSION_ORIGIN = 'chrome-extension://pagnaengchnbgecnappokojmdnagefpd';

describe('parseApiClientHeader', () => {
	it.each([
		['figma/0.1.0', { client: 'figma', version: '0.1.0' }],
		['browser-extension/1.1.0', { client: 'browser-extension', version: '1.1.0' }],
		['web', { client: 'web', version: null }],
		['  InDesign/0.3.0-beta.1 ', { client: 'indesign', version: '0.3.0-beta.1' }],
		['mcp-server/', { client: 'mcp-server', version: null }],
	])('parses %p', (value, expected) => {
		expect(parseApiClientHeader(value)).toEqual(expected);
	});

	it.each([undefined, '', 'photoshop/1.0.0', 'figma-ish', '/1.0.0'])('rejects %p', (value) => {
		expect(parseApiClientHeader(value)).toBeNull();
	});

	it('drops a version that is not a plain version string', () => {
		expect(parseApiClientHeader('figma/<script>')).toEqual({ client: 'figma', version: null });
		expect(parseApiClientHeader(`figma/${'1'.repeat(40)}`)).toEqual({
			client: 'figma',
			version: null,
		});
	});
});

describe('detectApiClient', () => {
	it('prefers the X-QRcodly-Client header over every heuristic', () => {
		expect(
			detectApiClient({
				headers: { 'x-qrcodly-client': 'desktop/1.2.0', 'user-agent': FIGMA_DESKTOP_UA },
				tokenType: 'api_key',
			}),
		).toEqual({ client: 'desktop', version: '1.2.0' });
	});

	it('records the header even for unauthenticated requests', () => {
		expect(detectApiClient({ headers: { 'x-qrcodly-client': 'web' }, tokenType: null })).toEqual({
			client: 'web',
			version: null,
		});
	});

	it('falls back to heuristics when the header names an unknown client', () => {
		expect(
			detectApiClient({
				headers: { 'x-qrcodly-client': 'sketch/1.0.0' },
				tokenType: 'api_key',
			}),
		).toEqual({ client: 'api', version: null });
	});

	it('leaves unauthenticated requests without the header unknown', () => {
		expect(detectApiClient({ headers: { 'user-agent': CHROME_UA }, tokenType: null })).toBeNull();
	});

	it('recognises the InDesign plugin and its version from the user agent', () => {
		expect(
			detectApiClient({ headers: { 'user-agent': INDESIGN_UA }, tokenType: 'api_key' }),
		).toEqual({ client: 'indesign', version: '0.2.0' });
	});

	it('recognises the Figma desktop app before treating Electron as the desktop app', () => {
		expect(
			detectApiClient({
				headers: { 'user-agent': FIGMA_DESKTOP_UA, origin: 'null' },
				tokenType: 'api_key',
			}),
		).toEqual({ client: 'figma', version: null });
	});

	it('recognises Figma in the browser by its opaque origin', () => {
		expect(
			detectApiClient({
				headers: { 'user-agent': CHROME_UA, origin: 'null' },
				tokenType: 'api_key',
			}),
		).toEqual({ client: 'figma', version: null });
	});

	it('recognises the browser extension by its origin', () => {
		expect(
			detectApiClient({
				headers: { 'user-agent': CHROME_UA, origin: EXTENSION_ORIGIN },
				tokenType: 'session_token',
			}),
		).toEqual({ client: 'browser-extension', version: null });
	});

	it('recognises the browser extension by the azp claim when there is no origin', () => {
		expect(
			detectApiClient({
				headers: { 'user-agent': CHROME_UA },
				tokenType: 'session_token',
				authorizedParty: EXTENSION_ORIGIN,
			}),
		).toEqual({ client: 'browser-extension', version: null });
	});

	it('recognises the desktop app by Electron in the user agent', () => {
		expect(
			detectApiClient({ headers: { 'user-agent': DESKTOP_APP_UA }, tokenType: 'session_token' }),
		).toEqual({ client: 'desktop', version: null });
	});

	it('treats other session tokens as the web app, including server-side rendering', () => {
		expect(
			detectApiClient({
				headers: { 'user-agent': CHROME_UA, origin: 'https://www.qrcodly.de' },
				tokenType: 'session_token',
				authorizedParty: 'https://www.qrcodly.de',
			}),
		).toEqual({ client: 'web', version: null });
		expect(
			detectApiClient({ headers: { 'user-agent': 'node' }, tokenType: 'session_token' }),
		).toEqual({ client: 'web', version: null });
	});

	it('treats other API keys as direct API usage', () => {
		expect(
			detectApiClient({ headers: { 'user-agent': 'curl/8.7.1' }, tokenType: 'api_key' }),
		).toEqual({ client: 'api', version: null });
	});
});
