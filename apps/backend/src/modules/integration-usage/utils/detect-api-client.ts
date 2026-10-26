import { type IncomingHttpHeaders } from 'node:http';
import { API_CLIENT_HEADER, parseApiClientHeader, type TApiClientInfo } from '@shared/schemas';
import { type TTokenType } from '@/core/domain/schema/UserSchema';

// "… InDesign/21.6.0 7b62450e/0.2.0" — 7b62450e is the plugin id from its UXP manifest
const INDESIGN_PLUGIN_VERSION = /\b7b62450e\/([0-9A-Za-z.+-]{1,32})/;

type TDetectApiClientInput = {
	headers: IncomingHttpHeaders;
	/** Null for unauthenticated requests. */
	tokenType: TTokenType | null;
	/** `azp` claim of a Clerk session token: the origin the session was created on. */
	authorizedParty?: string;
};

function firstHeader(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

/**
 * The `X-QRcodly-Client` header wins. Client releases from before that header are recognised by
 * the traces they leave in production traffic. Unauthenticated requests without the header stay
 * unknown, as they are mostly crawlers and scripts.
 *
 * Everything here is self-reported by the caller: good for usage statistics, never use it for
 * access decisions.
 */
export function detectApiClient({
	headers,
	tokenType,
	authorizedParty,
}: TDetectApiClientInput): TApiClientInfo | null {
	const declared = parseApiClientHeader(firstHeader(headers[API_CLIENT_HEADER.toLowerCase()]));
	if (declared) return declared;
	if (!tokenType) return null;

	const userAgent = firstHeader(headers['user-agent']) ?? '';
	const origin = firstHeader(headers.origin);

	if (userAgent.includes('InDesign/')) {
		return { client: 'indesign', version: INDESIGN_PLUGIN_VERSION.exec(userAgent)?.[1] ?? null };
	}

	// Figma's desktop app is Electron as well, so this has to run before the desktop check
	if (tokenType === 'api_key' && (origin === 'null' || userAgent.includes('Figma/'))) {
		return { client: 'figma', version: null };
	}

	// The extension only sends an Origin on POSTs, but its session tokens always carry it as azp
	if (
		origin?.startsWith('chrome-extension://') ||
		authorizedParty?.startsWith('chrome-extension://')
	) {
		return { client: 'browser-extension', version: null };
	}

	if (userAgent.includes('Electron/')) {
		return { client: 'desktop', version: null };
	}

	return { client: tokenType === 'api_key' ? 'api' : 'web', version: null };
}
