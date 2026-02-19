const mockLoadURL = jest.fn();
const mockLoadFile = jest.fn();
const mockWindowOn = jest.fn();
const mockOnce = jest.fn();
const mockGetBounds = jest.fn(() => ({ x: 100, y: 100, width: 1280, height: 800 }));
const mockIsMaximized = jest.fn(() => false);
const mockMaximize = jest.fn();
const mockShow = jest.fn();

const mockWebContents = {
	setWindowOpenHandler: jest.fn(),
	on: jest.fn(),
	send: jest.fn(),
};

jest.mock('electron', () => ({
	BrowserWindow: jest.fn().mockImplementation(() => ({
		loadURL: mockLoadURL,
		loadFile: mockLoadFile,
		on: mockWindowOn,
		once: mockOnce,
		getBounds: mockGetBounds,
		isMaximized: mockIsMaximized,
		maximize: mockMaximize,
		show: mockShow,
		webContents: mockWebContents,
	})),
	shell: {
		openExternal: jest.fn(),
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

jest.mock('../../src/main/store', () => ({
	store: {
		get: jest.fn(() => ({
			width: 1280,
			height: 800,
			isMaximized: false,
		})),
		set: jest.fn(),
	},
}));

import { createMainWindow } from '../../src/main/window';

describe('window', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should create a BrowserWindow and load the renderer', () => {
		const win = createMainWindow();

		expect(win).toBeDefined();
		// In test environment (no ELECTRON_RENDERER_URL), falls through to loadFile
		expect(mockLoadFile).toHaveBeenCalledWith(expect.stringContaining('index.html'));
	});

	it('should register ready-to-show handler', () => {
		createMainWindow();

		expect(mockOnce).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
	});

	it('should register window state persistence handlers', () => {
		createMainWindow();

		const eventNames = mockWindowOn.mock.calls.map((call: [string, ...unknown[]]) => call[0]);
		expect(eventNames).toContain('resize');
		expect(eventNames).toContain('move');
		expect(eventNames).toContain('maximize');
		expect(eventNames).toContain('unmaximize');
	});

	it('should set up external link handler', () => {
		createMainWindow();

		expect(mockWebContents.setWindowOpenHandler).toHaveBeenCalled();
	});
});
