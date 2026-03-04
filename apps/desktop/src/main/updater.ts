import { autoUpdater, type UpdateInfo } from 'electron-updater';
import log from 'electron-log/main';
import { getMainWindow } from './window';
import { store } from './store';
import { UPDATE_CHECK_INTERVAL_MS } from '../shared/constants';
import {
	IPC_UPDATE_AVAILABLE,
	IPC_UPDATE_NOT_AVAILABLE,
	IPC_UPDATE_DOWNLOAD_PROGRESS,
	IPC_UPDATE_DOWNLOADED,
	IPC_UPDATE_ERROR,
} from '../shared/ipc-channels';

let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

export function initAutoUpdater(): void {
	autoUpdater.logger = log;
	autoUpdater.autoDownload = true;
	autoUpdater.autoInstallOnAppQuit = true;

	autoUpdater.on('update-available', (info: UpdateInfo) => {
		log.info('Update available:', info.version);
		getMainWindow()?.webContents.send(IPC_UPDATE_AVAILABLE, {
			version: info.version,
			releaseDate: info.releaseDate,
		});
	});

	autoUpdater.on('update-not-available', () => {
		log.info('No update available');
		getMainWindow()?.webContents.send(IPC_UPDATE_NOT_AVAILABLE);
	});

	autoUpdater.on('download-progress', (progress) => {
		getMainWindow()?.webContents.send(IPC_UPDATE_DOWNLOAD_PROGRESS, {
			percent: progress.percent,
			bytesPerSecond: progress.bytesPerSecond,
			total: progress.total,
			transferred: progress.transferred,
		});
	});

	autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
		log.info('Update downloaded:', info.version);
		getMainWindow()?.webContents.send(IPC_UPDATE_DOWNLOADED, {
			version: info.version,
		});
	});

	autoUpdater.on('error', (error) => {
		log.error('Auto-updater error:', error);
		getMainWindow()?.webContents.send(IPC_UPDATE_ERROR, {
			message: error.message,
		});
	});

	// Check for updates on launch
	if (store.get('autoUpdate')) {
		checkForUpdates();
		startPeriodicChecks();
	}
}

export function checkForUpdates(): void {
	autoUpdater.checkForUpdates().catch((err) => {
		log.error('Failed to check for updates:', err);
	});
}

export function installUpdate(): void {
	autoUpdater.quitAndInstall(false, true);
}

export function startPeriodicChecks(): void {
	stopPeriodicChecks();
	updateCheckInterval = setInterval(() => {
		checkForUpdates();
	}, UPDATE_CHECK_INTERVAL_MS);
}

export function stopPeriodicChecks(): void {
	if (updateCheckInterval) {
		clearInterval(updateCheckInterval);
		updateCheckInterval = null;
	}
}
