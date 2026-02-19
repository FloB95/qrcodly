const mockOn = jest.fn();
const mockCheckForUpdates = jest.fn().mockReturnValue(Promise.resolve());
const mockQuitAndInstall = jest.fn();

jest.mock('electron-updater', () => ({
	autoUpdater: {
		on: mockOn,
		checkForUpdates: mockCheckForUpdates,
		quitAndInstall: mockQuitAndInstall,
		logger: null,
		autoDownload: false,
		autoInstallOnAppQuit: false,
	},
}));

jest.mock('electron-log/main', () => ({
	__esModule: true,
	default: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

jest.mock('../../src/main/window', () => ({
	getMainWindow: jest.fn(() => ({
		webContents: {
			send: jest.fn(),
		},
	})),
}));

jest.mock('../../src/main/store', () => ({
	store: {
		get: jest.fn(() => true),
	},
}));

import { initAutoUpdater, checkForUpdates, installUpdate } from '../../src/main/updater';

describe('updater', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should register event handlers on init', () => {
		initAutoUpdater();

		expect(mockOn).toHaveBeenCalledWith('update-available', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('update-not-available', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('download-progress', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
	});

	it('should check for updates on init when autoUpdate is enabled', () => {
		initAutoUpdater();

		expect(mockCheckForUpdates).toHaveBeenCalled();
	});

	it('should call checkForUpdates', () => {
		checkForUpdates();

		expect(mockCheckForUpdates).toHaveBeenCalled();
	});

	it('should call quitAndInstall on installUpdate', () => {
		installUpdate();

		expect(mockQuitAndInstall).toHaveBeenCalledWith(false, true);
	});
});
