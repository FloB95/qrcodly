import Store from 'electron-store';

export interface StoreSchema {
	windowBounds: {
		x?: number;
		y?: number;
		width: number;
		height: number;
		isMaximized: boolean;
	};
	autoUpdate: boolean;
	startMinimized: boolean;
	locale: string;
	lastUrl: string;
}

const defaults: StoreSchema = {
	windowBounds: {
		width: 1280,
		height: 800,
		isMaximized: false,
	},
	autoUpdate: true,
	startMinimized: false,
	locale: 'en',
	lastUrl: '',
};

export const store = new Store<StoreSchema>({
	name: 'qrcodly-settings',
	defaults,
});
