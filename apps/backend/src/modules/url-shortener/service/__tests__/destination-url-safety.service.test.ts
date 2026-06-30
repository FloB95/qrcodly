import 'reflect-metadata';
import { DestinationUrlSafetyService } from '../destination-url-safety.service';
import type { WebRiskService, UrlSafetyViolationTracker } from '@/core/url-safety';
import { MaliciousDestinationUrlError } from '../../error/http/malicious-destination-url.error';
import { AccountBannedError } from '@/core/error/http';
import { mock } from 'jest-mock-extended';

// Transitively imported via the url-safety barrel — keep Clerk inert.
jest.mock('@clerk/fastify', () => ({
	clerkClient: { users: { updateUserMetadata: jest.fn() } },
}));

jest.mock('@/core/config/env', () => ({
	env: {
		FRONTEND_URL: 'https://test.qrcodly.de',
		BASE_URL: 'https://api.qrcodly.de',
		BACKEND_URL: 'https://backend.qrcodly.de',
	},
}));

describe('DestinationUrlSafetyService', () => {
	let service: DestinationUrlSafetyService;
	let mockWebRisk: jest.Mocked<WebRiskService>;
	let mockTracker: jest.Mocked<UrlSafetyViolationTracker>;
	const userId = 'user_123';

	beforeEach(() => {
		mockWebRisk = mock<WebRiskService>();
		mockTracker = mock<UrlSafetyViolationTracker>();
		service = new DestinationUrlSafetyService(mockWebRisk, mockTracker);
	});

	afterEach(() => jest.clearAllMocks());

	it('skips the check for an empty destination', async () => {
		await service.assertDestinationUrlSafe(null, userId, 'create');
		expect(mockWebRisk.isSafe).not.toHaveBeenCalled();
	});

	it('skips the check for internal (own-domain) destinations', async () => {
		// e.g. the dynamic-qr handler URL set by the vCard/Event strategies.
		await service.assertDestinationUrlSafe('https://test.qrcodly.de/u/abc12', userId, 'update');
		expect(mockWebRisk.isSafe).not.toHaveBeenCalled();
		expect(mockTracker.recordViolation).not.toHaveBeenCalled();
	});

	it('passes for a safe external destination without recording a violation', async () => {
		mockWebRisk.isSafe.mockResolvedValue({ safe: true });

		await expect(
			service.assertDestinationUrlSafe('https://example.com', userId, 'create'),
		).resolves.toBeUndefined();
		expect(mockTracker.recordViolation).not.toHaveBeenCalled();
	});

	it('throws MaliciousDestinationUrlError for an unsafe destination (not yet banned)', async () => {
		mockWebRisk.isSafe.mockResolvedValue({ safe: false, threatTypes: ['SOCIAL_ENGINEERING'] });
		mockTracker.recordViolation.mockResolvedValue({ banned: false, violationCount: 1 });

		await expect(
			service.assertDestinationUrlSafe('https://phishing.example.com', userId, 'create'),
		).rejects.toBeInstanceOf(MaliciousDestinationUrlError);

		expect(mockTracker.recordViolation).toHaveBeenCalledWith(
			userId,
			'https://phishing.example.com',
			['SOCIAL_ENGINEERING'],
			'create',
		);
	});

	it('throws AccountBannedError when the violation crosses the ban threshold', async () => {
		mockWebRisk.isSafe.mockResolvedValue({ safe: false, threatTypes: ['MALWARE'] });
		mockTracker.recordViolation.mockResolvedValue({ banned: true, violationCount: 3 });

		await expect(
			service.assertDestinationUrlSafe('https://malware.example.com', userId, 'update'),
		).rejects.toBeInstanceOf(AccountBannedError);
	});
});
