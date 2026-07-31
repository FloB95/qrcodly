import 'reflect-metadata';
import { DestinationUrlSafetyService } from '../destination-url-safety.service';
import type { WebRiskService } from '@/core/url-safety';
import type { UrlSafetyEscalationService } from '../url-safety-escalation.service';
import type UrlSafetyIncidentRepository from '../../domain/repository/url-safety-incident.repository';
import { MaliciousDestinationUrlError } from '../../error/http/malicious-destination-url.error';
import { AccountBannedError } from '@/core/error/http';
import { mock } from 'jest-mock-extended';

// Transitively imported via the url-safety barrel — keep Clerk inert.
jest.mock('@clerk/fastify', () => ({
	clerkClient: { users: { updateUserMetadata: jest.fn() } },
	createClerkClient: jest.fn(() => ({ users: { getUser: jest.fn() } })),
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
	let mockEscalation: jest.Mocked<UrlSafetyEscalationService>;
	let mockIncidents: jest.Mocked<UrlSafetyIncidentRepository>;
	const userId = 'user_123';

	beforeEach(() => {
		mockWebRisk = mock<WebRiskService>();
		mockEscalation = mock<UrlSafetyEscalationService>();
		mockIncidents = mock<UrlSafetyIncidentRepository>();
		service = new DestinationUrlSafetyService(mockWebRisk, mockEscalation, mockIncidents);
	});

	afterEach(() => jest.clearAllMocks());

	it('skips the check for an empty destination', async () => {
		await service.assertDestinationUrlSafe(null, userId, 'create');
		expect(mockWebRisk.lookup).not.toHaveBeenCalled();
	});

	it('skips the check for internal (own-domain) destinations', async () => {
		// e.g. the dynamic-qr handler URL set by the vCard/Event strategies.
		await service.assertDestinationUrlSafe('https://test.qrcodly.de/handler', userId, 'update');
		expect(mockWebRisk.lookup).not.toHaveBeenCalled();
		expect(mockEscalation.recordOffence).not.toHaveBeenCalled();
	});

	it('passes for a safe external destination without recording anything', async () => {
		mockWebRisk.lookup.mockResolvedValue({ status: 'safe' });

		await expect(
			service.assertDestinationUrlSafe('https://example.com', userId, 'create'),
		).resolves.toBeUndefined();
		expect(mockEscalation.recordOffence).not.toHaveBeenCalled();
		expect(mockIncidents.record).not.toHaveBeenCalled();
	});

	it('stays fail-open on an unknown verdict (Web Risk outage must not block a write)', async () => {
		mockWebRisk.lookup.mockResolvedValue({ status: 'unknown', unknownReason: 'http_error' });

		await expect(
			service.assertDestinationUrlSafe('https://example.com', userId, 'create'),
		).resolves.toBeUndefined();
		expect(mockEscalation.recordOffence).not.toHaveBeenCalled();
		expect(mockIncidents.record).not.toHaveBeenCalled();
	});

	it('throws MaliciousDestinationUrlError for an unsafe destination (not yet banned)', async () => {
		mockWebRisk.lookup.mockResolvedValue({
			status: 'unsafe',
			threatTypes: ['SOCIAL_ENGINEERING'],
		});
		mockEscalation.recordOffence.mockResolvedValue({
			outcome: 'warned',
			offenceCount: 1,
			banned: false,
		});

		await expect(
			service.assertDestinationUrlSafe(
				'https://phishing.example.com/pay?token=secret',
				userId,
				'create',
			),
		).rejects.toBeInstanceOf(MaliciousDestinationUrlError);

		expect(mockEscalation.recordOffence).toHaveBeenCalledWith({
			userId,
			hosts: ['phishing.example.com'],
			threatTypes: ['SOCIAL_ENGINEERING'],
			source: 'create',
		});
	});

	it('records the incident with the hostname only, never the full URL', async () => {
		mockWebRisk.lookup.mockResolvedValue({ status: 'unsafe', threatTypes: ['MALWARE'] });
		mockEscalation.recordOffence.mockResolvedValue({
			outcome: 'warned',
			offenceCount: 1,
			banned: false,
		});

		await expect(
			service.assertDestinationUrlSafe(
				'https://malware.example.com/drop?session=abc123',
				userId,
				'duplicate',
				'short-url-1',
			),
		).rejects.toBeInstanceOf(MaliciousDestinationUrlError);

		expect(mockIncidents.record).toHaveBeenCalledWith({
			userId,
			shortUrlId: 'short-url-1',
			destinationHost: 'malware.example.com',
			threatTypes: ['MALWARE'],
			source: 'duplicate',
			action: 'rejected',
		});
	});

	it('throws AccountBannedError when the offence crosses the ban threshold', async () => {
		mockWebRisk.lookup.mockResolvedValue({ status: 'unsafe', threatTypes: ['MALWARE'] });
		mockEscalation.recordOffence.mockResolvedValue({
			outcome: 'banned',
			offenceCount: 2,
			banned: true,
		});

		await expect(
			service.assertDestinationUrlSafe('https://malware.example.com', userId, 'update'),
		).rejects.toBeInstanceOf(AccountBannedError);
	});
});
