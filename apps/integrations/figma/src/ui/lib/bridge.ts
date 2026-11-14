import type {
	InsertFormat,
	InsertQrCodeParams,
	PlacementTarget,
	PluginMethod,
	PluginMethods,
	PluginToUiMessage,
	UiToPluginMessage,
} from '../../shared/messages';

type PendingCall = { resolve: (value: unknown) => void; reject: (error: Error) => void };

const pending = new Map<number, PendingCall>();
const placementListeners = new Set<(target: PlacementTarget) => void>();
let nextId = 0;

// Opened as a plain page (e.g. `dist/ui.html` in a browser) there is no plugin
// sandbox to talk to; fall back to in-page state so the UI stays usable in dev.
// The API key stays in memory only — it must never land in localStorage.
const inFigma = window.parent !== window;
let devApiKey: string | null = null;

window.addEventListener(
	'message',
	(event: MessageEvent<{ pluginMessage?: PluginToUiMessage } | null>) => {
		const message = event.data?.pluginMessage;
		if (!message) return;
		if (message.type === 'placement') {
			placementListeners.forEach((listener) => listener(message.target));
			return;
		}
		const call = pending.get(message.id);
		if (!call) return;
		pending.delete(message.id);
		if (message.error === undefined) call.resolve(message.result);
		else call.reject(new Error(message.error));
	},
);

const devHandlers: {
	[M in PluginMethod]: (params: PluginMethods[M]['params']) => Promise<PluginMethods[M]['result']>;
} = {
	getSettings: async () => ({
		apiKey: devApiKey,
		insertFormat: localStorage.getItem('qrcodly.insertFormat') === 'png' ? 'png' : 'svg',
	}),
	setApiKey: async ({ apiKey }) => {
		devApiKey = apiKey;
	},
	clearApiKey: async () => {
		devApiKey = null;
	},
	setInsertFormat: async ({ format }) => localStorage.setItem('qrcodly.insertFormat', format),
	getPlacement: async () => ({ mode: 'viewport' }),
	insertQrCode: async (params) => console.info('qrcodly: insert (no Figma host)', params),
};

function call<M extends PluginMethod>(
	method: M,
	params: PluginMethods[M]['params'],
): Promise<PluginMethods[M]['result']> {
	if (!inFigma) return devHandlers[method](params);

	const id = ++nextId;
	return new Promise((resolve, reject) => {
		pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
		const message = { type: 'request', id, method, params } as UiToPluginMessage;
		parent.postMessage({ pluginMessage: message }, '*');
	});
}

export const plugin = {
	getSettings: () => call('getSettings', undefined),
	setApiKey: (apiKey: string) => call('setApiKey', { apiKey }),
	clearApiKey: () => call('clearApiKey', undefined),
	setInsertFormat: (format: InsertFormat) => call('setInsertFormat', { format }),
	getPlacement: () => call('getPlacement', undefined),
	insertQrCode: (params: InsertQrCodeParams) => call('insertQrCode', params),
};

export function onPlacementChange(listener: (target: PlacementTarget) => void): () => void {
	placementListeners.add(listener);
	return () => placementListeners.delete(listener);
}
