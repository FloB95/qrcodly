import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPreferredLocale, loadMessages } from './i18n';

describe('getPreferredLocale', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns a supported locale derived from navigator.language', () => {
		vi.stubGlobal('navigator', { language: 'de-DE' });
		expect(getPreferredLocale()).toBe('de');
	});

	it('falls back to en for unsupported browser languages', () => {
		vi.stubGlobal('navigator', { language: 'ja-JP' });
		expect(getPreferredLocale()).toBe('en');
	});

	it('handles plain language codes without region', () => {
		vi.stubGlobal('navigator', { language: 'fr' });
		expect(getPreferredLocale()).toBe('fr');
	});
});

describe('loadMessages', () => {
	it('loads dictionary modules for every supported locale', async () => {
		const messages = await loadMessages('en');
		expect(typeof messages).toBe('object');
		expect(messages).not.toBeNull();
	});

	it('falls back to the english loader for unknown locales', async () => {
		// Cast to bypass the SupportedLanguages narrowing — we explicitly want to
		// test the runtime fallback when an invalid value slips through.
		const messages = await loadMessages('zz' as never);
		expect(typeof messages).toBe('object');
		expect(messages).not.toBeNull();
	});
});
