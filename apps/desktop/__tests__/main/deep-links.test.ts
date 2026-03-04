jest.mock('electron', () => ({
	app: {
		setAsDefaultProtocolClient: jest.fn(),
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
	getMainWindow: jest.fn(),
	navigateTo: jest.fn(),
}));

import { parseDeepLinkUrl } from '../../src/main/deep-links';

describe('deep-links', () => {
	describe('parseDeepLinkUrl', () => {
		it('should parse a simple deep link', () => {
			const result = parseDeepLinkUrl('qrcodly://qr-codes/create');
			expect(result).toBe('/dashboard/qr-codes/create');
		});

		it('should parse root deep link', () => {
			const result = parseDeepLinkUrl('qrcodly://dashboard');
			expect(result).toBe('/dashboard/dashboard');
		});

		it('should return null for invalid protocol', () => {
			const result = parseDeepLinkUrl('https://example.com');
			expect(result).toBeNull();
		});

		it('should return null for malformed URL', () => {
			const result = parseDeepLinkUrl('not-a-url');
			expect(result).toBeNull();
		});

		it('should handle deep link with path segments', () => {
			const result = parseDeepLinkUrl('qrcodly://qr-codes/abc123/edit');
			expect(result).toBe('/dashboard/qr-codes/abc123/edit');
		});
	});
});
