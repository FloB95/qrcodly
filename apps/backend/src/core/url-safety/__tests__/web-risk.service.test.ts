import 'reflect-metadata';
import { WebRiskService } from '../web-risk.service';
import type { KeyCache } from '@/core/cache';
import type { Logger } from '@/core/logging';
import { mock } from 'jest-mock-extended';

jest.mock('@/core/config/env', () => ({
	env: { GOOGLE_WEB_RISK_API_KEY: 'test-web-risk-key' },
}));

import { env } from '@/core/config/env';

describe('WebRiskService', () => {
	let service: WebRiskService;
	let mockCache: jest.Mocked<KeyCache>;
	let mockLogger: jest.Mocked<Logger>;
	let mockFetch: jest.Mock;
	const originalFetch = global.fetch;

	beforeEach(() => {
		(env as { GOOGLE_WEB_RISK_API_KEY?: string }).GOOGLE_WEB_RISK_API_KEY = 'test-web-risk-key';
		mockCache = mock<KeyCache>();
		mockLogger = mock<Logger>();
		mockCache.get.mockResolvedValue(null);
		mockCache.set.mockResolvedValue();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
		service = new WebRiskService(mockCache, mockLogger);
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.clearAllMocks();
	});

	it('returns safe and skips the API when no key is configured (fail-open)', async () => {
		(env as { GOOGLE_WEB_RISK_API_KEY?: string }).GOOGLE_WEB_RISK_API_KEY = undefined;

		const result = await service.isSafe('https://example.com');

		expect(result).toEqual({ safe: true });
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns safe from cache without hitting the API', async () => {
		mockCache.get.mockResolvedValue('safe');

		const result = await service.isSafe('https://example.com');

		expect(result.safe).toBe(true);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns safe and caches the verdict when the API finds no threat', async () => {
		mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

		const result = await service.isSafe('https://example.com');

		expect(result.safe).toBe(true);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockCache.set).toHaveBeenCalledWith(
			expect.stringContaining('url_safety:lookup:'),
			'safe',
			expect.any(Number),
		);
	});

	it('returns unsafe with threatTypes when the API reports a threat', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ threat: { threatTypes: ['SOCIAL_ENGINEERING'] } }),
		});

		const result = await service.isSafe('https://phishing.example.com');

		expect(result.safe).toBe(false);
		expect(result.threatTypes).toEqual(['SOCIAL_ENGINEERING']);
		expect(mockCache.set).not.toHaveBeenCalled();
	});

	it('fails open (safe) when the API responds with a non-OK status', async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) });

		const result = await service.isSafe('https://example.com');

		expect(result.safe).toBe(true);
	});

	it('fails open (safe) when the request throws or times out', async () => {
		mockFetch.mockRejectedValue(new Error('AbortError: timeout'));

		const result = await service.isSafe('https://example.com');

		expect(result.safe).toBe(true);
	});
});
