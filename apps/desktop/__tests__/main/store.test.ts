jest.mock('electron-store', () => {
	return jest.fn().mockImplementation((opts: { defaults?: Record<string, unknown> }) => {
		const data = { ...opts?.defaults };
		return {
			get: jest.fn((key: string) => data[key]),
			set: jest.fn((key: string, value: unknown) => {
				data[key] = value;
			}),
			store: data,
		};
	});
});

import { store } from '../../src/main/store';

describe('store', () => {
	it('should export a store with default values', () => {
		expect(store).toBeDefined();
		expect(store.get('autoUpdate')).toBe(true);
		expect(store.get('startMinimized')).toBe(false);
		expect(store.get('locale')).toBe('en');
		expect(store.get('lastUrl')).toBe('');
	});

	it('should have correct window bounds defaults', () => {
		const bounds = store.get('windowBounds');
		expect(bounds).toEqual({
			width: 1280,
			height: 800,
			isMaximized: false,
		});
	});

	it('should allow setting values', () => {
		store.set('locale', 'de');
		expect(store.get('locale')).toBe('de');
	});
});
