import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { container } from 'tsyringe';
import { type Logger } from '@/core/logging';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import type AnalyticsIntegrationRepository from '../../../domain/repository/analytics-integration.repository';
import type ScanIpExclusionRepository from '../../../domain/repository/scan-ip-exclusion.repository';
import { type ScanIpExclusionMatcherService } from '../../../service/scan-ip-exclusion-matcher.service';
import { DeleteAnalyticsDataOnUserDeletedEventHandler } from '../user-deleted.event-handler';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

describe('DeleteAnalyticsDataOnUserDeletedEventHandler', () => {
	let logger: MockProxy<Logger>;
	let integrations: MockProxy<AnalyticsIntegrationRepository>;
	let exclusions: MockProxy<ScanIpExclusionRepository>;
	let matcher: MockProxy<ScanIpExclusionMatcherService>;
	let handler: DeleteAnalyticsDataOnUserDeletedEventHandler;

	const event = new UserDeletedEvent({ id: 'user-1' });

	beforeEach(() => {
		logger = mock<Logger>();
		integrations = mock<AnalyticsIntegrationRepository>();
		exclusions = mock<ScanIpExclusionRepository>();
		matcher = mock<ScanIpExclusionMatcherService>();
		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			if (name === 'Logger') return logger;
			if (name === 'AnalyticsIntegrationRepository') return integrations;
			if (name === 'ScanIpExclusionRepository') return exclusions;
			if (name === 'ScanIpExclusionMatcherService') return matcher;
			return {};
		});
		handler = new DeleteAnalyticsDataOnUserDeletedEventHandler();
	});

	it("deletes the user's integrations and excluded IP ranges", async () => {
		await handler.handle(event);

		expect(integrations.deleteAllByUserId).toHaveBeenCalledWith('user-1');
		expect(exclusions.deleteAllByUserId).toHaveBeenCalledWith('user-1');
		expect(matcher.invalidate).toHaveBeenCalledWith('user-1');
		expect(logger.error).not.toHaveBeenCalled();
	});

	it('still deletes the excluded IP ranges when deleting the integrations fails', async () => {
		integrations.deleteAllByUserId.mockRejectedValue(new Error('boom'));

		await expect(handler.handle(event)).resolves.toBeUndefined();

		expect(exclusions.deleteAllByUserId).toHaveBeenCalledWith('user-1');
		expect(matcher.invalidate).toHaveBeenCalledWith('user-1');
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith('analytics.integration.user-cleanup.failed', {
			error: expect.any(Error),
			userId: 'user-1',
		});
	});

	it('logs a failed deletion of the excluded IP ranges instead of letting it escape', async () => {
		exclusions.deleteAllByUserId.mockRejectedValue(new Error('boom'));

		await expect(handler.handle(event)).resolves.toBeUndefined();

		expect(integrations.deleteAllByUserId).toHaveBeenCalledWith('user-1');
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith('analytics.scan-ip-exclusion.user-cleanup.failed', {
			error: expect.any(Error),
			userId: 'user-1',
		});
	});
});
