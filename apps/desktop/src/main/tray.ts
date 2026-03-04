import { Tray, Menu, nativeImage, app } from 'electron';
import { join } from 'path';
import { getMainWindow, navigateTo } from './window';
import { APP_NAME, DASHBOARD_PATH } from '../shared/constants';

let tray: Tray | null = null;

export function createTray(): Tray {
	const iconPath = join(__dirname, '../../resources/tray-icon.png');
	const icon = nativeImage.createFromPath(iconPath);

	tray = new Tray(icon);
	tray.setToolTip(APP_NAME);

	const contextMenu = Menu.buildFromTemplate([
		{
			label: `Open ${APP_NAME}`,
			click: () => showMainWindow(),
		},
		{
			label: 'New QR Code',
			click: () => {
				showMainWindow();
				navigateTo(`${DASHBOARD_PATH}/qr-codes/create`);
			},
		},
		{ type: 'separator' },
		{
			label: 'Quit',
			click: () => app.quit(),
		},
	]);

	tray.setContextMenu(contextMenu);

	tray.on('click', () => {
		showMainWindow();
	});

	return tray;
}

function showMainWindow(): void {
	const win = getMainWindow();
	if (!win) return;

	if (!win.isVisible()) {
		win.show();
	}
	if (win.isMinimized()) {
		win.restore();
	}
	win.focus();
}

export function destroyTray(): void {
	tray?.destroy();
	tray = null;
}
