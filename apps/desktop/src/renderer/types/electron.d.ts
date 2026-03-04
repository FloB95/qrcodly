interface ElectronAPI {
	getVersion: () => Promise<string>;
	getPlatform: () => Promise<string>;
	checkForUpdates: () => void;
	installUpdate: () => void;
	onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void;
	onUpdateNotAvailable: (callback: () => void) => () => void;
	onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void) => () => void;
	onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
	onUpdateError: (callback: (error: { message: string }) => void) => () => void;
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	navigateTo: (path: string) => void;
	onNavigate: (callback: (path: string) => void) => () => void;
	getStoreValue: (key: string) => Promise<unknown>;
	setStoreValue: (key: string, value: unknown) => void;
	showNotification: (options: { title: string; body: string }) => void;
}

declare global {
	interface Window {
		electronAPI?: ElectronAPI;
	}
}

export {};
