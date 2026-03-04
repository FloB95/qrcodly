import { app, ipcMain, Notification } from 'electron';
import log from 'electron-log/main';
import { createMainWindow, getMainWindow, navigateTo } from './window';
import { createMenu } from './menu';
import { createTray, destroyTray } from './tray';
import { registerProtocol, handleDeepLink } from './deep-links';
import { initAutoUpdater, checkForUpdates, installUpdate } from './updater';
import { store } from './store';
import { APP_NAME } from '../shared/constants';
import {
	IPC_GET_APP_VERSION,
	IPC_GET_PLATFORM,
	IPC_UPDATE_CHECK,
	IPC_UPDATE_INSTALL,
	IPC_WINDOW_MINIMIZE,
	IPC_WINDOW_MAXIMIZE,
	IPC_WINDOW_CLOSE,
	IPC_NAVIGATE,
	IPC_STORE_GET,
	IPC_STORE_SET,
	IPC_SHOW_NOTIFICATION,
} from '../shared/ipc-channels';

// Initialize logging
log.initialize();
log.info(`${APP_NAME} starting...`);

// Register deep link protocol before app is ready
registerProtocol();

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	// Second instance launched (Windows deep links come through here)
	app.on('second-instance', (_event, argv) => {
		const win = getMainWindow();
		if (win) {
			if (win.isMinimized()) win.restore();
			win.focus();
		}

		// On Windows, deep link URL is in argv
		if (process.platform === 'win32') {
			const deepLinkUrl = argv.find((arg) => arg.startsWith('qrcodly://'));
			if (deepLinkUrl) {
				handleDeepLink(deepLinkUrl);
			}
		}
	});

	// macOS deep link handling
	app.on('open-url', (event, url) => {
		event.preventDefault();
		handleDeepLink(url);
	});

	void app.whenReady().then(() => {
		// Set about panel info
		app.setAboutPanelOptions({
			applicationName: APP_NAME,
			applicationVersion: app.getVersion(),
			copyright: `Copyright ${new Date().getFullYear()} QRcodly`,
		});

		// Create window, menu, and tray
		createMainWindow();
		createMenu();
		createTray();

		// Set up IPC handlers
		registerIpcHandlers();

		// Initialize auto-updater (skip in dev)
		if (process.env.NODE_ENV !== 'development') {
			initAutoUpdater();
		}

		// macOS: recreate window when dock icon clicked
		app.on('activate', () => {
			if (!getMainWindow()) {
				createMainWindow();
			}
		});
	});

	// macOS: keep app running when all windows closed
	app.on('window-all-closed', () => {
		if (process.platform !== 'darwin') {
			destroyTray();
			app.quit();
		}
	});
}

function registerIpcHandlers(): void {
	// App info
	ipcMain.handle(IPC_GET_APP_VERSION, () => app.getVersion());
	ipcMain.handle(IPC_GET_PLATFORM, () => process.platform);

	// Updates
	ipcMain.on(IPC_UPDATE_CHECK, () => checkForUpdates());
	ipcMain.on(IPC_UPDATE_INSTALL, () => installUpdate());

	// Window controls
	ipcMain.on(IPC_WINDOW_MINIMIZE, () => getMainWindow()?.minimize());
	ipcMain.on(IPC_WINDOW_MAXIMIZE, () => {
		const win = getMainWindow();
		if (win?.isMaximized()) {
			win.unmaximize();
		} else {
			win?.maximize();
		}
	});
	ipcMain.on(IPC_WINDOW_CLOSE, () => getMainWindow()?.close());

	// Navigation
	ipcMain.on(IPC_NAVIGATE, (_event, path: string) => navigateTo(path));

	// Store
	ipcMain.handle(IPC_STORE_GET, (_event, key: string) =>
		store.get(key as keyof typeof store.store),
	);
	ipcMain.on(IPC_STORE_SET, (_event, key: string, value: unknown) => {
		store.set(key as keyof typeof store.store, value);
	});

	// Notifications
	ipcMain.on(IPC_SHOW_NOTIFICATION, (_event, options: { title: string; body: string }) => {
		new Notification({
			title: options.title,
			body: options.body,
		}).show();
	});
}
