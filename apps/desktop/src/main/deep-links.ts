import { app } from 'electron';
import log from 'electron-log/main';
import { getMainWindow, navigateTo } from './window';
import { PROTOCOL_SCHEME, DASHBOARD_PATH } from '../shared/constants';

/**
 * Register the qrcodly:// protocol scheme.
 * Must be called before app.whenReady().
 */
export function registerProtocol(): void {
	if (process.defaultApp) {
		// During development, register with the path to Electron
		if (process.argv.length >= 2) {
			const scriptPath = process.argv[1];
			if (scriptPath) {
				app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [scriptPath]);
			}
		}
	} else {
		app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
	}
}

/**
 * Handle a deep link URL (qrcodly://path).
 * Parses the URL and navigates the main window to the corresponding dashboard route.
 */
export function handleDeepLink(url: string): void {
	log.info(`Deep link received: ${url}`);

	const path = parseDeepLinkUrl(url);
	if (!path) return;

	const win = getMainWindow();
	if (!win) return;

	if (!win.isVisible()) {
		win.show();
	}
	if (win.isMinimized()) {
		win.restore();
	}
	win.focus();

	navigateTo(path);
}

/**
 * Parse a qrcodly:// URL into a dashboard path.
 * e.g. qrcodly://qr-codes/create → /dashboard/qr-codes/create
 */
export function parseDeepLinkUrl(url: string): string | null {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== `${PROTOCOL_SCHEME}:`) {
			log.warn(`Invalid protocol: ${parsed.protocol}`);
			return null;
		}

		// The "hostname" becomes the first path segment
		const host = parsed.hostname;
		const pathname = parsed.pathname;

		// Combine host + pathname for the full path
		const fullPath = host ? `/${host}${pathname}` : pathname || '/';

		return `${DASHBOARD_PATH}${fullPath === '/' ? '' : fullPath}`;
	} catch {
		log.error(`Failed to parse deep link URL: ${url}`);
		return null;
	}
}
