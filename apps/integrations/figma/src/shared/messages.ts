// Contract between the UI iframe and the plugin sandbox. The UI owns the
// network (API calls, rendering); the sandbox owns the Figma document and
// clientStorage, which the UI cannot reach.

export type InsertFormat = 'svg' | 'png';

export type QrImage = { format: 'svg'; svg: string } | { format: 'png'; bytes: Uint8Array };

export type InsertQrCodeParams = {
	qrCodeId: string;
	name: string;
	image: QrImage;
};

export type PluginSettings = {
	apiKey: string | null;
	insertFormat: InsertFormat;
};

/** Where the next insert lands, derived from the current selection. */
export type PlacementTarget =
	{ mode: 'viewport' } | { mode: 'replace' | 'fill' | 'inside' | 'cover'; nodeName: string };

export type PluginMethods = {
	getSettings: { params: undefined; result: PluginSettings };
	setApiKey: { params: { apiKey: string }; result: void };
	clearApiKey: { params: undefined; result: void };
	setInsertFormat: { params: { format: InsertFormat }; result: void };
	getPlacement: { params: undefined; result: PlacementTarget };
	insertQrCode: { params: InsertQrCodeParams; result: void };
};

export type PluginMethod = keyof PluginMethods;

export type UiToPluginMessage = {
	[M in PluginMethod]: {
		type: 'request';
		id: number;
		method: M;
		params: PluginMethods[M]['params'];
	};
}[PluginMethod];

export type PluginToUiMessage =
	| { type: 'response'; id: number; result?: unknown; error?: string }
	| { type: 'placement'; target: PlacementTarget };
