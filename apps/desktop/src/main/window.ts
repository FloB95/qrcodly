import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import log from 'electron-log/main';
import { store } from './store';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from '../shared/constants';
import { IPC_NAVIGATE } from '../shared/ipc-channels';

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
	return mainWindow;
}

export function createMainWindow(): BrowserWindow {
	const bounds = store.get('windowBounds');

	mainWindow = new BrowserWindow({
		width: bounds.width,
		height: bounds.height,
		x: bounds.x,
		y: bounds.y,
		minWidth: MIN_WINDOW_WIDTH,
		minHeight: MIN_WINDOW_HEIGHT,
		show: false,
		titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
		trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 16 } : undefined,
		webPreferences: {
			preload: join(__dirname, '../preload/index.js'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	if (bounds.isMaximized) {
		mainWindow.maximize();
	}

	// Show window when ready to prevent white flash
	mainWindow.once('ready-to-show', () => {
		mainWindow?.show();
	});

	// Persist window state
	mainWindow.on('resize', saveWindowState);
	mainWindow.on('move', saveWindowState);
	mainWindow.on('maximize', saveWindowState);
	mainWindow.on('unmaximize', saveWindowState);

	// Open external links in system browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (url.startsWith('http://') || url.startsWith('https://')) {
			void shell.openExternal(url);
		}
		return { action: 'deny' };
	});

	// Handle navigation to external URLs
	mainWindow.webContents.on('will-navigate', (event, url) => {
		// Allow Clerk auth redirects and local dev server
		if (
			url.includes('clerk.accounts.dev') ||
			url.includes('accounts.clerk.dev') ||
			url.startsWith('file://') ||
			url.startsWith('http://localhost')
		) {
			return;
		}

		if (url.startsWith('http://') || url.startsWith('https://')) {
			event.preventDefault();
			void shell.openExternal(url);
		}
	});

	// Load the renderer
	if (process.env.ELECTRON_RENDERER_URL) {
		log.info(`Loading dev server: ${process.env.ELECTRON_RENDERER_URL}`);
		void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		log.info('Loading production renderer');
		void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	return mainWindow;
}

function saveWindowState(): void {
	if (!mainWindow) return;

	const isMaximized = mainWindow.isMaximized();
	const bounds = mainWindow.getBounds();

	store.set('windowBounds', {
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		isMaximized,
	});
}

export function loadOfflinePage(): void {
	if (!mainWindow) return;
	const offlinePath = join(__dirname, '../../resources/offline.html');
	void mainWindow.loadFile(offlinePath);
}

/** Navigate the renderer via IPC (React Router will handle the route) */
export function navigateTo(path: string): void {
	if (!mainWindow) return;
	mainWindow.webContents.send(IPC_NAVIGATE, path);
}
