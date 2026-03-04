import { contextBridge, ipcRenderer } from 'electron';
import {
	IPC_GET_APP_VERSION,
	IPC_GET_PLATFORM,
	IPC_UPDATE_CHECK,
	IPC_UPDATE_INSTALL,
	IPC_UPDATE_AVAILABLE,
	IPC_UPDATE_NOT_AVAILABLE,
	IPC_UPDATE_DOWNLOAD_PROGRESS,
	IPC_UPDATE_DOWNLOADED,
	IPC_UPDATE_ERROR,
	IPC_WINDOW_MINIMIZE,
	IPC_WINDOW_MAXIMIZE,
	IPC_WINDOW_CLOSE,
	IPC_NAVIGATE,
	IPC_STORE_GET,
	IPC_STORE_SET,
	IPC_SHOW_NOTIFICATION,
} from '../shared/ipc-channels';

const electronAPI = {
	// App info
	getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_GET_APP_VERSION),
	getPlatform: (): Promise<string> => ipcRenderer.invoke(IPC_GET_PLATFORM),

	// Updates
	checkForUpdates: (): void => ipcRenderer.send(IPC_UPDATE_CHECK),
	installUpdate: (): void => ipcRenderer.send(IPC_UPDATE_INSTALL),
	onUpdateAvailable: (callback: (info: { version: string }) => void): (() => void) => {
		const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) =>
			callback(info);
		ipcRenderer.on(IPC_UPDATE_AVAILABLE, handler);
		return () => ipcRenderer.removeListener(IPC_UPDATE_AVAILABLE, handler);
	},
	onUpdateNotAvailable: (callback: () => void): (() => void) => {
		const handler = () => callback();
		ipcRenderer.on(IPC_UPDATE_NOT_AVAILABLE, handler);
		return () => ipcRenderer.removeListener(IPC_UPDATE_NOT_AVAILABLE, handler);
	},
	onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void): (() => void) => {
		const handler = (_event: Electron.IpcRendererEvent, progress: { percent: number }) =>
			callback(progress);
		ipcRenderer.on(IPC_UPDATE_DOWNLOAD_PROGRESS, handler);
		return () => ipcRenderer.removeListener(IPC_UPDATE_DOWNLOAD_PROGRESS, handler);
	},
	onUpdateDownloaded: (callback: (info: { version: string }) => void): (() => void) => {
		const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) =>
			callback(info);
		ipcRenderer.on(IPC_UPDATE_DOWNLOADED, handler);
		return () => ipcRenderer.removeListener(IPC_UPDATE_DOWNLOADED, handler);
	},
	onUpdateError: (callback: (error: { message: string }) => void): (() => void) => {
		const handler = (_event: Electron.IpcRendererEvent, error: { message: string }) =>
			callback(error);
		ipcRenderer.on(IPC_UPDATE_ERROR, handler);
		return () => ipcRenderer.removeListener(IPC_UPDATE_ERROR, handler);
	},

	// Window controls
	minimize: (): void => ipcRenderer.send(IPC_WINDOW_MINIMIZE),
	maximize: (): void => ipcRenderer.send(IPC_WINDOW_MAXIMIZE),
	close: (): void => ipcRenderer.send(IPC_WINDOW_CLOSE),

	// Navigation
	navigateTo: (path: string): void => ipcRenderer.send(IPC_NAVIGATE, path),
	onNavigate: (callback: (path: string) => void): (() => void) => {
		const handler = (_event: Electron.IpcRendererEvent, path: string) => callback(path);
		ipcRenderer.on(IPC_NAVIGATE, handler);
		return () => ipcRenderer.removeListener(IPC_NAVIGATE, handler);
	},

	// Store
	getStoreValue: (key: string): Promise<unknown> => ipcRenderer.invoke(IPC_STORE_GET, key),
	setStoreValue: (key: string, value: unknown): void => ipcRenderer.send(IPC_STORE_SET, key, value),

	// Notifications
	showNotification: (options: { title: string; body: string }): void =>
		ipcRenderer.send(IPC_SHOW_NOTIFICATION, options),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
