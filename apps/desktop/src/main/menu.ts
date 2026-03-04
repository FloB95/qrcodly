import { Menu, shell, app, type MenuItemConstructorOptions } from 'electron';
import { getMainWindow, navigateTo } from './window';
import { APP_NAME } from '../shared/constants';

export function createMenu(): void {
	const isMac = process.platform === 'darwin';

	const template: MenuItemConstructorOptions[] = [
		...(isMac
			? [
					{
						label: APP_NAME,
						submenu: [
							{ role: 'about' as const },
							{ type: 'separator' as const },
							{ role: 'services' as const },
							{ type: 'separator' as const },
							{ role: 'hide' as const },
							{ role: 'hideOthers' as const },
							{ role: 'unhide' as const },
							{ type: 'separator' as const },
							{ role: 'quit' as const },
						],
					},
				]
			: []),
		{
			label: 'File',
			submenu: [
				{
					label: 'New QR Code',
					accelerator: 'CmdOrCtrl+N',
					click: () => navigateTo('/dashboard/qr-codes/create'),
				},
				{ type: 'separator' },
				{
					label: 'QR Codes',
					accelerator: 'CmdOrCtrl+1',
					click: () => navigateTo('/dashboard/qr-codes'),
				},
				{
					label: 'Templates',
					accelerator: 'CmdOrCtrl+2',
					click: () => navigateTo('/dashboard/templates'),
				},
				{
					label: 'Tags',
					accelerator: 'CmdOrCtrl+3',
					click: () => navigateTo('/dashboard/tags'),
				},
				{ type: 'separator' },
				isMac ? { role: 'close' } : { role: 'quit' },
			],
		},
		{
			label: 'Edit',
			submenu: [
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ role: 'selectAll' },
			],
		},
		{
			label: 'View',
			submenu: [
				{
					label: 'Reload',
					accelerator: 'CmdOrCtrl+R',
					click: () => getMainWindow()?.webContents.reload(),
				},
				{ type: 'separator' },
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
				...(process.env.NODE_ENV === 'development'
					? [{ type: 'separator' as const }, { role: 'toggleDevTools' as const }]
					: []),
			],
		},
		{
			label: 'Go',
			submenu: [
				{
					label: 'QR Codes',
					click: () => navigateTo('/dashboard/qr-codes'),
				},
				{
					label: 'Templates',
					click: () => navigateTo('/dashboard/templates'),
				},
				{
					label: 'Tags',
					click: () => navigateTo('/dashboard/tags'),
				},
				{ type: 'separator' },
				{
					label: 'Settings',
					accelerator: 'CmdOrCtrl+,',
					click: () => navigateTo('/dashboard/settings/profile'),
				},
			],
		},
		{
			label: 'Window',
			submenu: [
				{ role: 'minimize' },
				{ role: 'zoom' },
				...(isMac
					? [
							{ type: 'separator' as const },
							{ role: 'front' as const },
							{ type: 'separator' as const },
							{ role: 'window' as const },
						]
					: [{ role: 'close' as const }]),
			],
		},
		{
			label: 'Help',
			submenu: [
				{
					label: `${APP_NAME} Website`,
					click: () => {
						void shell.openExternal('https://www.qrcodly.de');
					},
				},
				{
					label: 'Report Issue',
					click: () => {
						void shell.openExternal('https://github.com/FloB95/qrcodly/issues');
					},
				},
				...(isMac
					? []
					: [
							{ type: 'separator' as const },
							{
								label: `About ${APP_NAME}`,
								click: () => app.showAboutPanel(),
							},
						]),
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}
